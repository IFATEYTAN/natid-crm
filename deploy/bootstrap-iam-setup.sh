#!/usr/bin/env bash
# Creates the scoped IAM role for RUNNING deploy/provision.sh and the
# accompanying ACM commands by hand. This is NOT the role GitHub
# Actions assumes at deploy time (that one, app-natid-co-il-deploy, is
# created BY provision.sh itself, not by this script).
#
# You need SOME existing credential with iam:CreateRole/PutRolePolicy to
# run this script in the first place — that's an unavoidable bootstrap
# step, reasonable to do from an account admin session (or root, for this
# one action only). Everything after this uses the scoped role instead of
# that broader session.
#
# The role grants only what deploy/provision.sh and the ACM steps
# in docs/DEPLOYMENT.md actually call — see bootstrap-iam-policy.json.
# No Route 53 permissions — DNS for this project isn't hosted in Route 53.
# Deliberately excludes anything destructive (no DeleteBucket,
# DeleteDistribution, DeleteRole) and scopes the IAM actions themselves to
# exactly the one deploy role by ARN, not IAM roles/policies in general —
# an identity that can create *arbitrary* IAM roles and attach *arbitrary*
# policies to them is equivalent to full account admin (it could just
# create a new AdministratorAccess role and assume that instead).
#
# Usage:
#   ASSUMER_ARNS='arn:aws:iam::123456789012:user/adiel' ./deploy/bootstrap-iam-setup.sh
#   # multiple principals allowed to assume this role: comma-separated
#   REQUIRE_MFA=false ./deploy/bootstrap-iam-setup.sh   # if you don't have MFA set up yet
set -euo pipefail

: "${ROLE_NAME:=app-natid-co-il-deploy-bootstrap}"
: "${REQUIRE_MFA:=true}"
: "${ASSUMER_ARNS:?Set to the IAM user/role ARN(s) allowed to assume this role (comma-separated for more than one)}"

PRINCIPAL_JSON=$(python3 -c "
import json
print(json.dumps('$ASSUMER_ARNS'.split(',')))
")

if [ "$REQUIRE_MFA" = "true" ]; then
  CONDITION_BLOCK='"Condition": { "Bool": { "aws:MultiFactorAuthPresent": "true" } }'
else
  CONDITION_BLOCK=""
fi

TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": $PRINCIPAL_JSON },
      "Action": "sts:AssumeRole"$([ -n "$CONDITION_BLOCK" ] && echo ",")
      $CONDITION_BLOCK
    }
  ]
}
EOF
)

echo "== IAM role: $ROLE_NAME =="
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "already exists, updating trust policy"
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST_POLICY"
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST_POLICY" \
    --max-session-duration 3600
fi

echo "== Attaching permissions (bootstrap-iam-policy.json) =="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name "deployment-bootstrap" \
  --policy-document "file://$SCRIPT_DIR/bootstrap-iam-policy.json"

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

cat <<EOF

== Done ==
Role ARN: $ROLE_ARN

To use it day to day, add a profile to ~/.aws/config (source_profile should
be whichever profile already holds your actual long-term credentials):

[profile app-natid-deploy]
role_arn = $ROLE_ARN
source_profile = default
EOF
if [ "$REQUIRE_MFA" = "true" ]; then
cat <<EOF
mfa_serial = <your MFA device ARN, e.g. arn:aws:iam::123456789012:mfa/yourname>
EOF
fi
cat <<EOF

Then run every deployment command with that profile, e.g.:
  AWS_PROFILE=app-natid-deploy ./deploy/provision.sh
It assumes the role automatically (prompting for an MFA code first, if
required) and uses temporary session credentials — nothing long-lived.
EOF
