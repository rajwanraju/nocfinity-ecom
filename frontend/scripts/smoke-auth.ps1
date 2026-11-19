# P8 DoD smoke test: real Laravel API + a built storefront.
# Prerequisites: backend on http://127.0.0.1:8001 (php artisan serve / php -S),
# frontend build running, and SHOP_URL pointing at it (default http://localhost:3000).
# Example: $env:SHOP_URL='http://localhost:3001'; .\scripts\smoke-auth.ps1
$ErrorActionPreference = "Stop"

function Wait-Endpoint([string]$url, [int]$attempts = 40) {
    for ($i = 0; $i -lt $attempts; $i++) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
            return $true
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    return $false
}

$shopUrl = if ($env:SHOP_URL) { $env:SHOP_URL } else { "http://localhost:3000" }
$origin = $shopUrl

if (-not (Wait-Endpoint "http://127.0.0.1:8001/api/v1/products?per_page=1")) { throw "Backend did not start." }
if (-not (Wait-Endpoint "$shopUrl/")) { throw "Frontend did not start." }

# --- Customer login through the BFF -------------------------------------------------
$customer = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-WebRequest -Uri "$shopUrl/api/auth/login" -Method POST `
    -ContentType "application/json" -WebSession $customer -UseBasicParsing `
    -Headers @{ Origin = $origin } `
    -Body '{"email":"customer@nocfinity.test","password":"Customer123!"}'

$loginBody = $login.Content | ConvertFrom-Json
$setCookie = $login.Headers["Set-Cookie"] -join "; "

if ($loginBody.success -ne $true) { throw "Customer login failed: $($login.Content)" }
if ($login.Content -match "token") { throw "Customer login leaked the token in the body." }
if ($setCookie -notmatch "nocfinity_token=") { throw "Customer cookie was not set: $setCookie" }
if ($setCookie -notmatch "HttpOnly") { throw "Customer cookie is not HttpOnly: $setCookie" }

$me = Invoke-WebRequest -Uri "$shopUrl/api/auth/me" -WebSession $customer -UseBasicParsing
$meBody = $me.Content | ConvertFrom-Json
if ($meBody.data.email -ne "customer@nocfinity.test") { throw "Customer /me did not return the session user." }
Write-Host "PASS customer login: httpOnly cookie, /me returns $($meBody.data.email), body has no token."

# --- Admin login through the BFF ----------------------------------------------------
$admin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLogin = Invoke-WebRequest -Uri "$shopUrl/api/admin/auth/login" -Method POST `
    -ContentType "application/json" -WebSession $admin -UseBasicParsing `
    -Headers @{ Origin = $origin } `
    -Body '{"email":"admin@nocfinity.test","password":"SuperAdmin123!"}'

$adminCookie = $adminLogin.Headers["Set-Cookie"] -join "; "
$adminMe = Invoke-WebRequest -Uri "$shopUrl/api/admin/auth/me" -WebSession $admin -UseBasicParsing
$adminBody = $adminMe.Content | ConvertFrom-Json

if ($adminCookie -notmatch "nocfinity_admin_token=") { throw "Admin cookie was not set." }
if ($adminBody.data.permissions.Count -lt 1) { throw "Admin /me returned no permissions." }
if ($adminLogin.Content -match "token") { throw "Admin login leaked the token in the body." }
Write-Host "PASS admin login: httpOnly cookie, /me returns $($adminBody.data.roles -join ', ') with $($adminBody.data.permissions.Count) permissions."

# --- Cookie is httpOnly, so the /account page renders without a token in HTML --------
$account = Invoke-WebRequest -Uri "$shopUrl/account" -WebSession $customer -UseBasicParsing
if ($account.Content -match "Bearer ") { throw "Account HTML contains a bearer token." }
Write-Host "PASS /account renders for the cookie session without exposing the token."

# --- Cross-origin login is rejected -------------------------------------------------
try {
    Invoke-WebRequest -Uri "$shopUrl/api/auth/login" -Method POST `
        -ContentType "application/json" -WebSession $customer -UseBasicParsing `
        -Headers @{ Origin = "https://evil.test" } `
        -Body '{"email":"customer@nocfinity.test","password":"Customer123!"}' | Out-Null
    throw "Cross-origin login was not rejected."
} catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw "Expected 403 for cross-origin login, got $($_.Exception.Response.StatusCode.value__)." }
    Write-Host "PASS cross-origin login rejected with 403."
}

# --- Guest hitting /admin is redirected by the proxy --------------------------------
try {
    $guest = Invoke-WebRequest -Uri "$shopUrl/admin" -UseBasicParsing -MaximumRedirection 0

    if ($guest.StatusCode -notin 301, 302, 307, 308) {
        throw "Guest /admin returned status $($guest.StatusCode)."
    }

    Write-Host "PASS guest /admin redirect ($($guest.StatusCode) -> $($guest.Headers.Location))."
} catch [System.Net.WebException] {
    $response = $_.Exception.Response
    $status = [int]$response.StatusCode

    if ($status -notin 301, 302, 307, 308) { throw "Guest /admin returned status $status." }

    Write-Host "PASS guest /admin redirect ($status -> $($response.Headers['Location']))."
}
