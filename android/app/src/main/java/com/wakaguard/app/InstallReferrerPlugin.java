package com.wakaguard.app;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Who invited this person, as Google Play passed it along with the install.
 *
 * An invite link sends a friend to the app's Play page with the inviter's
 * username attached (src/lib/installReferrer.ts). Play hands that text to the
 * app when asked, so "Who invited you?" can be filled in for them. It needs no
 * permission and reads nothing else. An install that did not come from an
 * invite link gives Play's own text, or nothing.
 */
@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrerPlugin extends Plugin {

    @PluginMethod
    public void get(PluginCall call) {
        AtomicBoolean answered = new AtomicBoolean(false);
        InstallReferrerClient client = InstallReferrerClient.newBuilder(getContext()).build();
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int response) {
                    String referrer = null;
                    if (response == InstallReferrerClient.InstallReferrerResponse.OK) {
                        try {
                            referrer = client.getInstallReferrer().getInstallReferrer();
                        } catch (Exception unreadable) {
                            // Answered with nothing
                        }
                    }
                    client.endConnection();
                    answer(call, answered, referrer);
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    // Play went away before answering
                    answer(call, answered, null);
                }
            });
        } catch (Exception noPlay) {
            // No Google Play on this phone
            answer(call, answered, null);
        }
    }

    private static void answer(PluginCall call, AtomicBoolean answered, String referrer) {
        if (!answered.compareAndSet(false, true)) return;
        JSObject result = new JSObject();
        if (referrer != null) result.put("referrer", referrer);
        call.resolve(result);
    }
}
