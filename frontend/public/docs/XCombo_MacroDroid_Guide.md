# XPeng XCombo One-Tap Shortcuts

*Using MacroDroid on Android*

**XPeng Australia Owner Community Guide**

## Overview

This guide explains how to create one-tap shortcuts on your Android phone that directly execute your XPeng XCombo scenes — similar to iPhone Shortcuts. When triggered, the macro opens the XCombo scene and runs it automatically, without any manual interaction.

### What you need:

- MacroDroid app installed on your Android phone (free version works)
- XPeng app (com.xiaopeng.globalcarinfo) installed and logged in
- Your XCombo scene Share Link (to get the Scene ID)
- MacroDroid Accessibility Service enabled

> 💡 *This method was developed by the XPeng AU owner community through reverse engineering of the XPeng app's internal deep link routing system.*

## Step 1: Get Your Scene ID

Each XCombo scene has a unique ID embedded in its share link. Here is how to find it:

1. Open the XPeng app on your phone
2. Navigate to XCombo
3. Tap the scene you want to create a shortcut for
4. Tap the three-dot menu (⋯) in the top right corner
5. Select **Share** or **Copy Link**
6. Paste the link somewhere (Notes app, etc.) — it will look like:

> `https://app.xiaopeng.com/xcombo/detail?sceneId=4c80084db7824c7fbafc7b0eb03fecc7&vin=L1NNSG*******783`

7. Copy the value after `sceneId=` (the long string of letters and numbers)
8. Also note the value after `vin=` (your vehicle VIN)

> 💡 *The sceneId is a fixed unique identifier for your scene and will not change. Your VIN is your vehicle's identification number and is the same for all your XCombo shortcuts.*

## Step 2: Enable MacroDroid Accessibility Service

MacroDroid needs Accessibility permission to simulate screen taps. This is required to automatically press the Run and Confirm buttons.

1. Open **Android Settings**
2. Go to **Accessibility**
3. Tap **Installed Services** (or Downloaded Apps)
4. Find **MacroDroid** and tap it
5. Toggle it **ON** and confirm

> 💡 *Without Accessibility enabled, the tap actions in the macro will not work.*

## Step 3: Create the MacroDroid Macro

Open MacroDroid and create a new macro. Add the following actions in order:

### Actions

| # | Action | Details |
|---|--------|---------|
| 1 | **Launch App → XPeng** | Select XPeng from the app list — this pre-warms the app |
| 2 | **Wait → 3000ms** | Gives the app time to fully initialise and connect |
| 3 | **Send Intent** | See configuration below |
| 4 | **Wait → 3000ms** | Waits for the XCombo detail screen to load |
| 5 | **Shell Script** | `input tap 1040 2720` |
| 6 | **Wait → 1000ms** | Waits for the confirmation dialog to appear |
| 7 | **Shell Script** | `input tap 1050 1970 && sleep 1 && input keyevent 4` |

### Action 3 — Send Intent Configuration

In the Send Intent action, fill in the following fields:

- **Action:** `android.intent.action.VIEW`
- **Data / URI:** `xiaopeng://www.xiaopeng.com/common/car/xcombo/detail?sceneId=YOUR_SCENE_ID&vin=YOUR_VIN`
- **Package:** `com.xiaopeng.globalcarinfo`
- **Target:** Activity

Replace `YOUR_SCENE_ID` and `YOUR_VIN` with the values you copied in Step 1. For example:

> `xiaopeng://www.xiaopeng.com/common/car/xcombo/detail?sceneId=4c80084db7824c7fbafc7b0eb03fecc7&vin=L1NNSG*******783`

### Shell Script Actions Explained

**Action 5** taps the Run button at the bottom right of the XCombo detail screen:

```
input tap 1040 2720
```

**Action 7** taps the Confirm button on the confirmation dialog, waits 1 second, then presses Back to return to the home screen:

```
input tap 1050 1970 && sleep 1 && input keyevent 4
```

> 💡 *These tap coordinates are based on a 1440x3168 screen resolution (common on modern Android phones). If your phone has a different resolution, the coordinates may need adjusting. Take a screenshot of the XCombo detail screen and the confirmation dialog, then measure the button positions.*

## Step 4: Add a Trigger

Choose how you want to activate your shortcut. MacroDroid supports many trigger types:

- **Home Screen Widget** — tap a button on your home screen (recommended)
- **Quick Settings Tile** — swipe down the notification shade and tap a tile
- **NFC Tag** — tap your phone on an NFC sticker placed in your car
- **Floating Button** — an always-visible overlay button
- **Voice** — trigger via Google Assistant

For a home screen widget trigger, in MacroDroid:

1. Tap **Add Trigger**
2. Select **Widget / Shortcut**
3. Choose a name and icon for your shortcut
4. Long press your home screen and add the MacroDroid widget

## Step 5: Test the Macro

1. Go to your home screen (or wherever your trigger is)
2. Activate the trigger
3. Watch the XPeng app open, navigate to your scene, and execute it automatically

> 💡 *If you get an 'Oops Server Error', the app may not have fully initialised. Try increasing the wait time in Action 2 from 3000ms to 5000ms.*

## Creating Shortcuts for Multiple Scenes

For each additional XCombo scene you want a shortcut for:

1. Get the sceneId from the scene's share link (Step 1)
2. In MacroDroid, duplicate your existing macro (long press → Duplicate)
3. Edit Action 3 — change only the sceneId value in the URI
4. Rename the macro to match the scene name
5. Add a new trigger with a different icon/name

All other actions remain identical — only the sceneId changes between macros.

## Troubleshooting

### Oops Server Error

The XPeng app returned an error loading the scene. Usually a timing issue.

- Increase Action 2 wait time to 5000ms
- Make sure you are connected to the internet
- Make sure the XPeng app is logged in

### Tap Actions Not Working

The shell script tap commands are not pressing the right buttons.

- Ensure MacroDroid Accessibility Service is enabled (Step 2)
- Your phone screen resolution may be different — adjust coordinates
- Take a screenshot during the XCombo detail screen and measure button positions

### App Not Opening

The XPeng app fails to launch.

- Verify the package name is `com.xiaopeng.globalcarinfo`
- Ensure the app is installed and not force-stopped

### Scene Runs When Car is Off

XPeng shows a confirmation dialog saying the scene will run before the vehicle is turned on. This is normal for Remote XCombo scenes. The macro handles this automatically by tapping the Confirm button in Action 7.

## Technical Background

This guide was developed by analysing the XPeng app's internal routing system using ADB and APK inspection. Key findings:

- The XPeng app uses ARouter for internal navigation with the `xiaopeng://` URL scheme
- XCombo scenes are accessible via the deep link path `/common/car/xcombo/detail`
- Scene IDs are stable UUIDs that do not change
- There is no direct execute API exposed — the Run button tap is required
- The confirmation dialog appears for Remote XCombo scenes when the car is off

---

*XPeng Australia Owner Community • 2026*
