package com.wakaguard.app;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Asks Android's own question, "Allow WakaGuard to always run in the
 * background?", so a trip is not cut off by the phone's battery saving. Until
 * build 25 people had to find Apps, WakaGuard, Battery, Unrestricted themselves
 * (a tester's problem report, 18 October 2026: could it be a permission people
 * simply accept?).
 *
 * Google Play allows this only where the app's main job needs it; it is
 * declared in Play Console with the reason: a trip watched for the traveller's
 * safety, whose position must keep reaching the server with the screen off.
 *
 * Used from src/lib/keepRunningPermission.ts.
 */
@CapacitorPlugin(name = "KeepRunning")
public class KeepRunningPlugin extends Plugin {

    /** Whether WakaGuard may already run without battery limits */
    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(result());
    }

    /** Shows Android's question, then says what the answer was */
    @SuppressLint("BatteryLife")
    @PluginMethod
    public void ask(PluginCall call) {
        if (isAllowed()) {
            call.resolve(result());
            return;
        }
        Intent question = new Intent(
            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            Uri.parse("package:" + getContext().getPackageName())
        );
        try {
            startActivityForResult(call, question, "afterAsking");
        } catch (ActivityNotFoundException noQuestion) {
            // A few phones leave the question out: open the battery list instead
            try {
                startActivityForResult(call, new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS), "afterAsking");
            } catch (ActivityNotFoundException noList) {
                call.resolve(result());
            }
        }
    }

    @ActivityCallback
    private void afterAsking(PluginCall call, ActivityResult answer) {
        if (call == null) return;
        call.resolve(result());
    }

    private boolean isAllowed() {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return power != null && power.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    private JSObject result() {
        JSObject out = new JSObject();
        out.put("allowed", isAllowed());
        return out;
    }
}
