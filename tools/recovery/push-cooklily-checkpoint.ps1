$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$checkpointRelative = 'docs/execution-checkpoints/cooklily-surveys-and-canonical-integration.md'
$sourceCheckpoint = Join-Path $repoRoot $checkpointRelative
if (-not (Test-Path -LiteralPath $sourceCheckpoint -PathType Leaf)) { throw "Checkpoint ausente: $sourceCheckpoint" }
$remoteName = 'origin'
$branchRef = 'refs/heads/cooklily/canonical'
$fetchRef = 'refs/remotes/origin/cooklily/canonical'
$workspaceRoot = [System.IO.Path]::GetFullPath($env:TEMP)
$temporaryWorktree = Join-Path $workspaceRoot ("cooklily-roadmap-" + [guid]::NewGuid().ToString('N'))
$temporaryWorktree = [System.IO.Path]::GetFullPath($temporaryWorktree)
if (-not $temporaryWorktree.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'O caminho temporário saiu da pasta temporária.' }
& git -C $repoRoot fetch $remoteName cooklily/canonical
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível atualizar a referência canonical remota.' }
$base = (& git -C $repoRoot rev-parse $fetchRef).Trim()
if ($LASTEXITCODE -ne 0 -or -not $base) { throw 'Não foi possível resolver a base canonical.' }
& git -C $repoRoot worktree add --detach $temporaryWorktree $base
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar a área temporária isolada.' }
try {
  $targetCheckpoint = Join-Path $temporaryWorktree $checkpointRelative
  $targetDirectory = Split-Path -Parent $targetCheckpoint
  New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
  Copy-Item -LiteralPath $sourceCheckpoint -Destination $targetCheckpoint -Force
  & git -C $temporaryWorktree add -- $checkpointRelative
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o checkpoint.' }
  $staged = @(& git -C $temporaryWorktree diff --cached --name-only)
  if ($staged.Count -ne 1 -or $staged[0].Trim() -ne $checkpointRelative) { throw 'Commit cancelado: o conteúdo preparado inclui arquivos além do checkpoint.' }
  & git -C $temporaryWorktree commit -m 'docs(cooklily): update execution checkpoint'
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o commit do checkpoint; confira a identidade Git configurada.' }
  $committed = @(& git -C $temporaryWorktree diff-tree --no-commit-id --name-only -r HEAD)
  if ($committed.Count -ne 1 -or $committed[0].Trim() -ne $checkpointRelative) { throw 'Commit cancelado: ele não contém somente o checkpoint.' }
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    $remoteHead = ((& git -C $repoRoot ls-remote $remoteName $branchRef) -split '\s+')[0]
    if (-not $remoteHead) { throw 'A branch canonical não foi encontrada no remoto.' }
    if ($remoteHead -ne $base) {
      & git -C $repoRoot fetch $remoteName cooklily/canonical
      if ($LASTEXITCODE -ne 0) { throw 'Falha ao atualizar canonical durante a publicação.' }
      $base = (& git -C $repoRoot rev-parse $fetchRef).Trim()
      & git -C $temporaryWorktree rebase $base
      if ($LASTEXITCODE -ne 0) { & git -C $temporaryWorktree rebase --abort; throw 'Canonical avançou com conflito no checkpoint; revise o checkpoint e execute novamente.' }
    }
    & git -C $temporaryWorktree push $remoteName "HEAD:$branchRef"
    if ($LASTEXITCODE -eq 0) { Write-Output "Checkpoint enviado sozinho para cooklily/canonical: $(git -C $temporaryWorktree rev-parse --short HEAD)"; break }
    if ($attempt -eq 3) { throw 'Push recusado após três tentativas; confira acesso e avanço remoto.' }
    & git -C $repoRoot fetch $remoteName cooklily/canonical
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao atualizar canonical após rejeição do push.' }
    $base = (& git -C $repoRoot rev-parse $fetchRef).Trim()
    & git -C $temporaryWorktree rebase $base
    if ($LASTEXITCODE -ne 0) { & git -C $temporaryWorktree rebase --abort; throw 'Canonical avançou com conflito no checkpoint; revise o checkpoint e execute novamente.' }
  }
} finally {
  & git -C $repoRoot worktree remove --force $temporaryWorktree 2>$null
}
