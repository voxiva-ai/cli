# Voxi.ly / Voxiva on GitHub

## What exists today

| Login | Type | URL |
|-------|------|-----|
| **voxiva-ai** | Organization | https://github.com/voxiva-ai |
| **voxily** | User (not an org) | https://github.com/voxily |

GitHub org URLs can’t contain a dot (`Voxi.ly`). Use **display name** `Voxi.ly` on the org profile, slug **`voxiva-ai`**.

Recommended home for this CLI: **`voxiva-ai/cli`**.

## Avatar

File in this repo: [`brand/org-avatar.png`](../brand/org-avatar.png)

After you’re an org owner:

1. Open https://github.com/organizations/voxiva-ai/settings/profile  
2. Set **Display name** → `Voxi.ly`  
3. Upload **Profile picture** → `brand/org-avatar.png`  
4. Add short bio: `Voxiva — CLI, Space, Voice, Web`

## Auth + publish (once)

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth login -h github.com -p https -w
```

Then from this folder:

```powershell
cd "D:\voxiva.ai\Voxiva CLI"
git add .
git commit -m "Initial public Voxiva CLI"
git branch -M main
& "C:\Program Files\GitHub CLI\gh.exe" repo create voxiva-ai/cli --public --source=. --remote=origin --push
```

## Safe install for others

```powershell
git clone https://github.com/voxiva-ai/cli.git
cd cli
.\scripts\install.ps1
```

Keys stay in `~/.voxiva/`. See [SECURITY.md](../SECURITY.md).
