@echo off
setlocal

:: 7-Zipのパス（必要に応じてフルパスに変更）
set "SEVENZIP=7z.exe"

:: ドロップされたすべてのファイルを処理
for %%F in (%*) do (
    if /I "%%~xF"==".zip" (
        echo 展開中: %%~nxF
        "%SEVENZIP%" x "%%~fF" -o"%%~dpnF" -y
        echo 完了: %%~nxF を %%~dpnF に展開しました。
    ) else (
        echo スキップ: %%~nxF（ZIPファイルではありません）
    )
)

pause
