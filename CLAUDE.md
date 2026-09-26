# Instructions for Claude

## Never without an explicit request

- **Never `git commit` or `git push`** unless I explicitly tell you to in the current conversation. Leave the changes in the working tree and tell me what is ready to commit. Approval for one commit or push does not cover later ones.
- **Never make changes in Azure** unless I explicitly tell you to. That covers running `infra/deploy.ps1`, `az` commands that create, update or delete anything (including `az staticwebapp appsettings set`), portal changes and deployments. Read-only `az` commands (`show`, `list`) are fine. Pushing to `main` also deploys to production through GitHub Actions, which is one more reason never to push unasked.
