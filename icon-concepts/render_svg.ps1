# PowerShell script to render SVG to PNG using .NET WebBrowser control
param(
    [string]$svgPath = "D:\Create\Schedule\icon-concepts\gemini-adapted.svg",
    [string]$outputPath = "D:\Create\Schedule\icon-concepts\icon-1024.png"
)

Add-Type -AssemblyName System.Windows.Forms

# Read SVG content
$svgContent = Get-Content $svgPath -Raw

# Create HTML that embeds the SVG
$html = @"
<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; padding: 0; background: white; }
  svg { width: 1024px; height: 1024px; }
</style>
</head>
<body>
$svgContent
</body>
</html>
"@

$htmlPath = [System.IO.Path]::GetTempFileName() + ".html"
Set-Content -Path $htmlPath -Value $html -Encoding UTF8

# Create a hidden WebBrowser, navigate to the HTML, capture when loaded
$form = New-Object System.Windows.Forms.Form
$form.Width = 1100
$form.Height = 1100
$form.WindowState = "Normal"

$web = New-Object System.Windows.Forms.WebBrowser
$web.Width = 1100
$web.Height = 1100
$web.ScrollBarsEnabled = $false
$form.Controls.Add($web)

$image = $null
$done = $false

$web.add_DocumentCompleted({
    Write-Host "Document completed: $($web.ReadyState)"
    Start-Sleep -Milliseconds 500
    try {
        $bmp = New-Object System.Drawing.Bitmap(1024, 1024)
        $rect = New-Object System.Drawing.Rectangle(0, 0, 1024, 1024)
        $bmp.SetResolution(96, 96)
        $graph = [System.Drawing.Graphics]::FromImage($bmp)
        $graph.CopyFromScreen(
            $form.PointToScreen([System.Drawing.Point]::Empty),
            [System.Drawing.Point]::Empty,
            $rect
        )
        $graph.Dispose()
        $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Saved to $outputPath"
    } catch {
        Write-Host "Error: $_"
    }
    $done = $true
    $form.Close()
})

$web.Navigate("file:///$($htmlPath.Replace('\','/'))")

# Show form (modal)
$form.ShowDialog()

# Cleanup
Remove-Item $htmlPath -Force -ErrorAction SilentlyContinue
Write-Host "Done"
