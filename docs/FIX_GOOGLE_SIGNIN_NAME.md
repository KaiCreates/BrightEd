# How to Fix "Sign in to continue to..." Name

The "critical information" you see (`brighted-b36ba.firebaseapp.com`) is the default project ID. To make this look professional (e.g., "Sign in to continue to **BrightEd**"), you need to update the **OAuth Consent Screen** in the Google Cloud Console.

## Steps to Fix

1.  **Go to Google Cloud Console**:
    *   Visit [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)
    *   Make sure you are selected in the project: `brighted-b36ba`

2.  **Edit App Information**:
    *   Click **EDIT APP**.
    *   Find the **App name** field.
    *   Change it from `brighted-b36ba.firebaseapp.com` to **BrightEd**.
    *   (Optional) Upload your logo to the **App logo** field.

3.  **Save Changes**:
    *   Click **SAVE AND CONTINUE** at the bottom.

## Result
Once saved, the Google Sign-In popup will clearly say:
> "Sign in to continue to **BrightEd**"
