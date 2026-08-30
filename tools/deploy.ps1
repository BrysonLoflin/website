# Deploy the site to GitHub Pages (gh-pages branch).
# Renders OUTSIDE Dropbox (os error 32 workaround), copies _site back for the
# local preview, then force-pushes the rendered site to gh-pages.
# Usage: powershell -File tools\deploy.ps1  (from anywhere)

$site = "C:\Users\bgllo\Dropbox\Projects\Website\site"
$tmp  = "$env:LOCALAPPDATA\Temp\site-render"
$repo = "https://github.com/BrysonLoflin/website.git"

robocopy $site $tmp /MIR /XD _site .quarto .git /NFL /NDL /NJH /NJS | Out-Null
& "$env:LOCALAPPDATA\Programs\quarto\bin\quarto.exe" render $tmp
if ($LASTEXITCODE -ne 0) { Write-Error "quarto render failed"; exit 1 }

# keep the local preview copy fresh (pitch dir is local-only, never deployed)
robocopy "$tmp\_site" "$site\_site" /MIR /XD pitch /NFL /NDL /NJH /NJS | Out-Null

# publish: ephemeral git repo inside the temp _site
New-Item -ItemType File -Force "$tmp\_site\.nojekyll" | Out-Null
Push-Location "$tmp\_site"
if (Test-Path .git) { Remove-Item -Recurse -Force .git }
git init -q -b gh-pages .
git -c user.name="Bryson Loflin" -c user.email="bglloflin@gmail.com" add -A
git -c user.name="Bryson Loflin" -c user.email="bglloflin@gmail.com" commit -qm "deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push -f $repo gh-pages
$ok = $LASTEXITCODE -eq 0
Remove-Item -Recurse -Force .git
Pop-Location
if ($ok) { Write-Output "Deployed to gh-pages." } else { Write-Error "git push failed"; exit 1 }
