#!/usr/bin/env bash
# One-time provisioning for app.natid.co.il's S3 + CloudFront hosting.
#
# Run BY HAND by whoever holds real AWS credentials — never executed by CI.
# Every step checks whether its resource already exists before creating
# it, so re-running after a partial failure (or to move from phase 1 to
# phase 2 below) is safe.
#
# TWO PHASES, because attaching a custom domain to CloudFront requires a
# validated ACM cert, which requires a DNS record someone with DNS access
# has to add — and that shouldn't block standing up and testing everything
# else. CloudFront always serves HTTPS regardless of phase; phase 1 just
# uses AWS's own default certificate for the *.cloudfront.net domain
# instead of a certificate for the real one. There is no path that puts
# $DOMAIN live without a real, validated certificate for it — CloudFront's
# API rejects attaching a custom domain alias without one.
#
#   Phase 1 (no ACM_CERT_ARN set): creates the bucket, distribution,
#     GitHub OIDC role — everything needed to prove the build/deploy
#     pipeline works end to end, served at the distribution's own
#     <id>.cloudfront.net domain. Nothing here needs DNS access.
#
#   Phase 2 (ACM_CERT_ARN set, re-run after phase 1): attaches $DOMAIN +
#     the certificate to the *same* distribution created in phase 1 via
#     `update-distribution`. This is the actual go-live step. Needs a
#     validated us-east-1 ACM cert (DNS validation record added by whoever
#     has DNS access) as a prerequisite, and afterwards still needs that
#     same person to point $DOMAIN at the distribution's domain in DNS —
#     this script cannot do that part either.
#
# Usage:
#   ./deploy/provision.sh                                          # phase 1
#   ACM_CERT_ARN=arn:aws:acm:us-east-1:...:certificate/... \
#     ./deploy/provision.sh                                        # phase 2
set -euo pipefail

: "${AWS_REGION:=il-central-1}"
: "${BUCKET_NAME:=app-natid-co-il-frontend}"
: "${DOMAIN:=app.natid.co.il}"
: "${GITHUB_REPO:=IFATEYTAN/natid-crm}"
: "${DEPLOY_ROLE_NAME:=app-natid-co-il-deploy}"
: "${DISTRIBUTION_COMMENT:=app.natid.co.il frontend}"
: "${ACM_CERT_ARN:=}"
if [ -z "$ACM_CERT_ARN" ]; then
  echo "ACM_CERT_ARN not set — running PHASE 1 (pipeline demo, default *.cloudfront.net domain only)."
else
  echo "ACM_CERT_ARN set — running PHASE 2 (attaching $DOMAIN + the certificate)."
fi

echo "== S3 bucket: $BUCKET_NAME =="
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "already exists, skipping create"
else
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION"
  fi
  aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi
BUCKET_DOMAIN="$BUCKET_NAME.s3.$AWS_REGION.amazonaws.com"

echo "== CloudFront Origin Access Control =="
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$BUCKET_NAME-oac'].Id | [0]" --output text)
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "Name=$BUCKET_NAME-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query 'OriginAccessControl.Id' --output text)
  echo "created OAC: $OAC_ID"
else
  echo "already exists: $OAC_ID"
fi

echo "== CloudFront distribution =="
EXISTING_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$DISTRIBUTION_COMMENT'].Id | [0]" --output text 2>/dev/null || echo "None")

if [ "$EXISTING_DIST_ID" = "None" ] || [ -z "$EXISTING_DIST_ID" ]; then
  # Phase 1 always creates the distribution on AWS's own default
  # certificate with no custom domain attached — even if ACM_CERT_ARN
  # happens to be set on a from-scratch run, creation itself stays
  # domain-free; the phase-2 update-distribution block below (which runs
  # unconditionally once the distribution exists) is what actually attaches
  # the real domain, so there's exactly one code path that does that,
  # instead of two that could drift apart.
  DIST_CONFIG=$(cat <<EOF
{
  "CallerReference": "$BUCKET_NAME-$(date +%s)",
  "Comment": "$DISTRIBUTION_COMMENT",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-origin",
        "DomainName": "$BUCKET_DOMAIN",
        "S3OriginConfig": { "OriginAccessIdentity": "" },
        "OriginAccessControlId": "$OAC_ID"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponseCode": "200", "ResponsePagePath": "/index.html", "ErrorCachingMinTTL": 10 },
      { "ErrorCode": 404, "ResponseCode": "200", "ResponsePagePath": "/index.html", "ErrorCachingMinTTL": 10 }
    ]
  },
  "Aliases": { "Quantity": 0, "Items": [] },
  "ViewerCertificate": { "CloudFrontDefaultCertificate": true },
  "PriceClass": "PriceClass_All"
}
EOF
)
  # CachePolicyId above is AWS's managed "CachingOptimized" policy
  # (658327ea-f89d-4fab-a63d-7e88639e58f6) — verify this ID against
  # `aws cloudfront list-cache-policies --type managed` before relying on
  # it; managed-policy IDs are stable but this wasn't checked against a
  # live account (no AWS credentials in the session that wrote this).
  CREATE_OUTPUT=$(aws cloudfront create-distribution --distribution-config "$DIST_CONFIG" --output json)
  DIST_ID=$(echo "$CREATE_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['Id'])")
  DIST_ARN=$(echo "$CREATE_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['ARN'])")
  DIST_DOMAIN=$(echo "$CREATE_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['DomainName'])")
  echo "created distribution (phase 1, default domain only): $DIST_ID ($DIST_DOMAIN)"
else
  DIST_ID="$EXISTING_DIST_ID"
  DIST_ARN=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.ARN' --output text)
  DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text)
  echo "already exists: $DIST_ID ($DIST_DOMAIN)"
fi

if [ -n "$ACM_CERT_ARN" ]; then
  echo "== Phase 2: attaching $DOMAIN + certificate to $DIST_ID =="
  CURRENT_ALIAS_COUNT=$(aws cloudfront get-distribution-config --id "$DIST_ID" \
    --query 'DistributionConfig.Aliases.Quantity' --output text)
  if [ "$CURRENT_ALIAS_COUNT" != "0" ]; then
    echo "custom domain already attached, nothing to do"
  else
    GET_OUTPUT=$(aws cloudfront get-distribution-config --id "$DIST_ID" --output json)
    ETAG=$(echo "$GET_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['ETag'])")
    UPDATED_CONFIG=$(echo "$GET_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)['DistributionConfig']
data['Aliases'] = {'Quantity': 1, 'Items': ['$DOMAIN']}
data['ViewerCertificate'] = {
    'ACMCertificateArn': '$ACM_CERT_ARN',
    'SSLSupportMethod': 'sni-only',
    'MinimumProtocolVersion': 'TLSv1.2_2021',
}
print(json.dumps(data))
")
    TMP_CONFIG_FILE=$(mktemp)
    trap 'rm -f "$TMP_CONFIG_FILE"' EXIT
    echo "$UPDATED_CONFIG" > "$TMP_CONFIG_FILE"
    aws cloudfront update-distribution --id "$DIST_ID" \
      --distribution-config "file://$TMP_CONFIG_FILE" --if-match "$ETAG" >/dev/null
    rm -f "$TMP_CONFIG_FILE"
    trap - EXIT
    echo "attached — can take several minutes to fully propagate through CloudFront's edge network"
  fi
fi

echo "== Bucket policy: allow this distribution to read via OAC =="
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
      "Condition": { "StringEquals": { "AWS:SourceArn": "$DIST_ARN" } }
    }
  ]
}
EOF
)
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "$BUCKET_POLICY"

echo "== GitHub OIDC identity provider =="
OIDC_URL="https://token.actions.githubusercontent.com"
OIDC_ARN=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?ends_with(Arn, 'token.actions.githubusercontent.com')].Arn | [0]" --output text)
if [ "$OIDC_ARN" = "None" ] || [ -z "$OIDC_ARN" ]; then
  OIDC_ARN=$(aws iam create-open-id-connect-provider \
    --url "$OIDC_URL" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
    --query 'OpenIDConnectProviderArn' --output text)
  echo "created: $OIDC_ARN"
  # Thumbprint above is GitHub's documented Actions OIDC root CA
  # thumbprint as of when this script was written — AWS's own console flow
  # now fetches this automatically; if create-open-id-connect-provider
  # rejects it, drop --thumbprint-list entirely (recent AWS CLI versions
  # no longer require it for github's provider) or fetch a fresh one from
  # https://github.com/actions/runner/blob/main/docs/adrs/. Not verified
  # against a live account.
else
  echo "already exists: $OIDC_ARN"
fi

echo "== Deploy IAM role (assumed by GitHub Actions via OIDC) =="
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "$OIDC_ARN" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        "StringLike": { "token.actions.githubusercontent.com:sub": "repo:$GITHUB_REPO:ref:refs/heads/main" }
      }
    }
  ]
}
EOF
)
if aws iam get-role --role-name "$DEPLOY_ROLE_NAME" >/dev/null 2>&1; then
  echo "role already exists, updating trust policy"
  aws iam update-assume-role-policy --role-name "$DEPLOY_ROLE_NAME" --policy-document "$TRUST_POLICY"
else
  aws iam create-role --role-name "$DEPLOY_ROLE_NAME" --assume-role-policy-document "$TRUST_POLICY"
fi

PERMISSIONS_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::$BUCKET_NAME", "arn:aws:s3:::$BUCKET_NAME/*"]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "$DIST_ARN"
    }
  ]
}
EOF
)
aws iam put-role-policy --role-name "$DEPLOY_ROLE_NAME" --policy-name "deploy-permissions" \
  --policy-document "$PERMISSIONS_POLICY"
DEPLOY_ROLE_ARN=$(aws iam get-role --role-name "$DEPLOY_ROLE_NAME" --query 'Role.Arn' --output text)

cat <<EOF

== Done ==
Bucket:            $BUCKET_NAME
CloudFront dist:   $DIST_ID
CloudFront domain: $DIST_DOMAIN
Deploy role ARN:   $DEPLOY_ROLE_ARN
EOF

if [ -z "$ACM_CERT_ARN" ]; then
  cat <<EOF

This was a PHASE 1 run — $DOMAIN is not attached yet; the distribution is
only reachable at https://$DIST_DOMAIN, on AWS's own default certificate.

Next:
  1. Add repo vars on github.com/$GITHUB_REPO (Settings > Secrets and
     variables > Actions > Variables) so deploy.yml can push builds here:
       AWS_DEPLOY_ROLE_ARN = $DEPLOY_ROLE_ARN
       S3_BUCKET_NAME      = $BUCKET_NAME
       CLOUDFRONT_DIST_ID  = $DIST_ID
  2. Push to main (or trigger deploy.yml manually) and verify
     https://$DIST_DOMAIN/ serves the app.
  3. When ready to go live: request the ACM cert in us-east-1, get it
     validated (needs a DNS record from whoever holds DNS access — see
     docs/DEPLOYMENT.md), then re-run this script with ACM_CERT_ARN set to
     attach $DOMAIN to this same distribution.
EOF
else
  cat <<EOF

This was a PHASE 2 run — $DOMAIN is now attached to $DIST_ID
(propagation can take several minutes).

Still needed to actually go live (see docs/DEPLOYMENT.md):
  1. Point $DOMAIN at $DIST_DOMAIN in DNS (alias/CNAME — whoever holds DNS
     access; Route 53 alias if that's where the zone lives).
  2. Update the VITE_SRV_BASE_URL repo variable to the real srv URL if it
     was still a placeholder from phase 1.
  3. Add https://$DOMAIN to srv's ALLOWED_ORIGINS.
EOF
fi
