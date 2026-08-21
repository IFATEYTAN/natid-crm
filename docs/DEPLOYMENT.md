# Deployment — S3 + CloudFront

Replaces Base44's own "Publish" (git-sync hosting) with a hosting setup this
repo owns and controls directly. Chosen over AWS Amplify Hosting because the
whole setup is scriptable — no console-only settings (notably Amplify's SPA
rewrite rule, which lives in the console, not the repo) — and because it's
meaningfully cheaper at this app's traffic (no per-build-minute charge, ~45%
lower per-GB transfer). See `../../CLAUDE.md` (workspace root) for how this
fits into the broader srv migration.

Does **not** touch `base44/` or `@base44/sdk` — any screen not yet in
`src/config/srvMigration.js`'s `SRV_MIGRATED_PAGES` still calls dead Base44
entities and will still error after this deploy, exactly as it does today.
That's expected; migrating those screens is separate, ongoing work.

## Two phases, and why

Attaching the real domain (`app.natid.co.il`) to CloudFront requires a
validated ACM certificate, which requires a DNS record added by whoever
holds DNS access for the domain — that shouldn't block standing up and
proving the rest of the pipeline. So this splits cleanly:

- **Phase 1 — demonstrate the pipeline.** Bucket, distribution, GitHub OIDC
  role, a real build-and-deploy. Served at CloudFront's own
  `<id>.cloudfront.net` domain, secured by **AWS's own default
  certificate** — this is real HTTPS, not "no TLS," just not the
  `app.natid.co.il` hostname yet. Needs **no DNS access at all**.
- **Phase 2 — go live.** Attaches `app.natid.co.il` + a validated
  certificate to the *same* distribution phase 1 created. There is no path
  that skips this — CloudFront's API refuses to attach a custom domain
  alias without a validated certificate for it, full stop. This phase
  needs exactly two small, one-time asks of whoever holds DNS access: the
  certificate's validation record, and later the final alias/CNAME
  pointing the real domain at CloudFront.

`deploy/provision.sh` implements both: run it with no `ACM_CERT_ARN` for
phase 1, then re-run it with `ACM_CERT_ARN` set (once the cert is issued)
for phase 2 — it updates the same distribution in place rather than
creating a second one.

## Architecture

```
GitHub push to main
  → .github/workflows/deploy.yml (npm run build, then AWS OIDC role assumption)
    → aws s3 sync dist/ → S3 bucket (private, no public access)
    → CloudFront invalidation
CloudFront
  → phase 1: <id>.cloudfront.net, AWS default certificate
  → phase 2: + app.natid.co.il alias, ACM certificate
  → Origin Access Control → S3 bucket
  → 403/404 → /index.html (200)   [SPA client-side-routing fallback, both phases]
```

`deploy.yml` itself doesn't change between phases — it only ever references
the bucket name and distribution ID (both fixed from phase 1 onward), never
the domain or certificate. No long-lived AWS access keys are stored in
GitHub either — it assumes an IAM role via GitHub's OIDC identity
federation, scoped to exactly this bucket and this distribution.

## Phase 0 — the identity that runs all of this (one-time)

Don't run `provision.sh` or the ACM commands under your personal admin
credentials. `deploy/bootstrap-iam-setup.sh` creates a scoped IAM role for
exactly that — least-privilege permissions (`deploy/bootstrap-iam-policy.json`:
S3/CloudFront/ACM create+read, plus IAM actions scoped to only the one
deploy role by ARN — nothing destructive, no ability to create or modify
other IAM roles), assumed with temporary session credentials rather than a
standing access key. No Route 53 permissions — DNS for this project isn't
hosted in Route 53, so those records get added with your actual DNS
provider instead (see Phase 2 below).

```bash
ASSUMER_ARNS='arn:aws:iam::<account>:user/<you>' ./deploy/bootstrap-iam-setup.sh
```

Requires *some* existing credential capable of `iam:CreateRole` to run —
that's an unavoidable one-time bootstrap (an account admin session, or
root, for this one action only). It prints a ready-to-paste `~/.aws/config`
profile block at the end; every command below assumes you're running with
`AWS_PROFILE` set to that profile, not a bare admin session.

## Phase 1 — demonstrate the pipeline (no DNS access needed)

1. **Run the provisioning script**, no arguments:
   ```bash
   ./deploy/provision.sh
   ```
   Creates: the S3 bucket (public access fully blocked), a CloudFront
   Origin Access Control, the CloudFront distribution (SPA error-response
   fallback, default cert, no custom domain), the bucket policy allowing
   only that distribution to read objects, the GitHub OIDC provider (if
   one doesn't already exist in the account — safe to run even if another
   repo's pipeline already created it), and a deploy IAM role scoped to
   just this bucket + distribution. Prints the CloudFront domain and the
   deploy role's ARN at the end.

   **Not verified against a live AWS account** (this session has no
   credentials) — read it before running; every JSON payload it builds was
   validated as syntactically-correct JSON and the script passes `bash -n`,
   but the live AWS API calls themselves haven't been exercised. A couple
   of specifics called out inline (the managed cache-policy ID, the OIDC
   provider's thumbprint) are believed correct as of when this was written
   but worth double-checking against current AWS docs first.

2. **Set repo variables** on `github.com/IFATEYTAN/natid-crm` → Settings →
   Secrets and variables → Actions → **Variables** tab (non-secret — a
   role ARN/bucket name/distribution ID aren't sensitive on their own, and
   Variables stay visible in workflow logs, unlike Secrets, which helps
   when debugging):
   - `AWS_DEPLOY_ROLE_ARN`, `S3_BUCKET_NAME`, `CLOUDFRONT_DIST_ID` — from
     the script's output
   - `VITE_SRV_BASE_URL` — leave unset for now if srv isn't deployed yet;
     the build falls back to `http://localhost:8000`, so the site will
     still build and serve, it just won't reach a real API yet. That's
     fine for phase 1 — the goal here is proving the *deploy* pipeline,
     not a fully working app.

3. **Deploy and verify**: push to `main`, or trigger manually —
   `gh workflow run deploy.yml --repo IFATEYTAN/natid-crm --ref main` —
   then confirm `https://<cloudfront-domain-from-step-1>/` serves the app
   shell over HTTPS.

## Phase 2 — go live (needs two DNS records from whoever holds DNS access)

1. **Request the ACM certificate**, in **us-east-1** specifically
   (CloudFront only ever accepts certs from that region, regardless of
   where the bucket/distribution live):
   ```bash
   aws acm request-certificate --domain-name app.natid.co.il \
     --validation-method DNS --region us-east-1
   ```
   Get the validation record:
   ```bash
   aws acm describe-certificate --certificate-arn <arn> --region us-east-1 \
     --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
   ```
   **This is the first of the two DNS asks** — hand that single CNAME
   (name + value) to whoever manages `natid.co.il`'s DNS. Then wait:
   ```bash
   aws acm wait certificate-validated --certificate-arn <arn> --region us-east-1
   ```

2. **Re-run the provisioning script**, now with the cert ARN:
   ```bash
   ACM_CERT_ARN=<arn-from-step-1> ./deploy/provision.sh
   ```
   This attaches `app.natid.co.il` + the certificate to the distribution
   phase 1 already created — same bucket, same distribution ID, same
   deploy role, nothing else changes.

3. **Point the domain at CloudFront** — **the second DNS ask**. DNS for
   `natid.co.il` isn't hosted in Route 53, so this is a plain request to
   whoever manages it: add a CNAME (or ALIAS, if the provider supports one
   at the apex/subdomain) for `app.natid.co.il` → the distribution domain
   the script printed in step 2.

4. **Update `VITE_SRV_BASE_URL`** to the real srv URL if it was still a
   placeholder, and re-deploy (`workflow_dispatch`) so the build picks it
   up.

5. **CORS**: add `https://app.natid.co.il` to srv's `ALLOWED_ORIGINS`.

## Verification checklist

Phase 1 (against the CloudFront default domain):
- [ ] `curl -I https://<cloudfront-domain>/` → `200`, `x-cache` header present
- [ ] `curl -I https://<cloudfront-domain>/Calls` → still `200` with the app
      shell, not a CloudFront/S3 XML error — proves the SPA fallback works
- [ ] Push a trivial commit to `main`, confirm `deploy.yml` runs green and
      the change is visible within a minute or two

Phase 2 (against the real domain, after DNS propagates):
- [ ] `curl -I https://app.natid.co.il/` → `200`
- [ ] Log in and confirm a migrated screen (Calls, CallDetails, Customers,
      ServiceProviders, ProductCatalog, UserManagement, RoleManagement)
      loads real data from srv — confirms `VITE_SRV_BASE_URL` and srv's
      `ALLOWED_ORIGINS` are both correct for the real domain
