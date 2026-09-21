# GitHub

Org: [voxiva-ai](https://github.com/voxiva-ai)  
Repo: `voxiva-ai/cli`

## Logo for the org avatar

Use the real Voxiva mark:

`D:\voxiva.ai\Voxiva CLI\brand\voxiva-mark.svg`

Upload: https://github.com/organizations/voxiva-ai/settings/profile  
(GitHub may ask for PNG — open the SVG in a browser, screenshot/export 512×512 if needed.)

## First push (after you create the empty public repo)

```powershell
cd "D:\voxiva.ai\Voxiva CLI"
git add .
git commit -m "Initial Voxiva CLI"
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/voxiva-ai/cli.git
git push -u origin main
```
