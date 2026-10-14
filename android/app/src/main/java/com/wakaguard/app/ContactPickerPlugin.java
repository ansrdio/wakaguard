package com.wakaguard.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Choosing one phone number with the phone's own contacts screen.
 *
 * The person picks a number there and Android hands over that one entry, and
 * only that one. So the app needs no permission to read contacts, and never
 * sees the rest of the address book. (The contacts plugin the app used before
 * read every contact, and asked for permission to read and to change them.)
 */
@CapacitorPlugin(name = "ContactPicker")
public class ContactPickerPlugin extends Plugin {

    @PluginMethod
    public void pick(PluginCall call) {
        Intent choose = new Intent(Intent.ACTION_PICK, Phone.CONTENT_URI);
        try {
            startActivityForResult(call, choose, "picked");
        } catch (ActivityNotFoundException noContactsApp) {
            call.reject("This phone has no contacts screen to choose from");
        }
    }

    @ActivityCallback
    private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Intent data = result.getData();
        Uri entry = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || entry == null) {
            // Backed out without choosing: not an error
            JSObject nothing = new JSObject();
            nothing.put("cancelled", true);
            call.resolve(nothing);
            return;
        }

        String[] columns = { Phone.DISPLAY_NAME, Phone.NUMBER };
        try (Cursor row = getContext().getContentResolver().query(entry, columns, null, null, null)) {
            if (row == null || !row.moveToFirst()) {
                call.reject("That contact could not be read");
                return;
            }
            JSObject chosen = new JSObject();
            chosen.put("cancelled", false);
            chosen.put("name", row.getString(0));
            chosen.put("phone", row.getString(1));
            call.resolve(chosen);
        } catch (Exception failed) {
            call.reject("That contact could not be read");
        }
    }
}
