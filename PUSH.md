# Pushing this to GitHub

This folder is already a git repository with the full history — 15 commits,
authored as you, so GitHub credits your contribution graph.

## One-time setup

Open PowerShell **in this folder** and run:

```powershell
git remote add origin https://github.com/Rehan010308/Lokasetu-Connecting-the-World.git
git branch -M main
git push -u origin main --force
```

`--force` is needed once, and only once. The remote currently holds a single
old commit from the first version; this replaces it with the full history.
Nothing is lost — that commit's code is a subset of what is here now.

If git asks you to sign in, a browser window opens. Approve it and the push
continues.

## Every time after this

```powershell
git add -A
git commit -m "what you changed"
git push
```

No more zips, and no more wondering which version you are running.

## Confirming the version

The build number prints on the login screen and at the bottom of the Profile
tab. It should read **v4.1.0**. If it does not, you are running an older copy.

## If the push is rejected

```
! [rejected] main -> main (fetch first)
```

That means the remote moved. Either force again (`git push --force`), or pull
and merge (`git pull --rebase origin main`, then `git push`).
