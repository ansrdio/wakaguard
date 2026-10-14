import Capacitor
import Contacts
import ContactsUI

/// Choosing one phone number with the iPhone's own contacts screen.
///
/// The person picks a number there and iOS hands over that one entry, and
/// only that one. So the app needs no permission to read contacts, and never
/// sees the rest of the address book. (The contacts plugin the app used before
/// asked for every contact and listed them inside the app.) The Android
/// version is ContactPickerPlugin.java; both answer src/lib/contactPicker.ts
/// with the same { cancelled, name, phone }.
@objc(ContactPickerPlugin)
public class ContactPickerPlugin: CAPPlugin, CAPBridgedPlugin, CNContactPickerDelegate {
    public let identifier = "ContactPickerPlugin"
    public let jsName = "ContactPicker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pick", returnType: CAPPluginReturnPromise)
    ]

    /// The request waiting for the person to choose
    private var waiting: CAPPluginCall?

    @objc func pick(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let screen = self.bridge?.viewController else {
                call.reject("The contacts screen could not be opened")
                return
            }
            // A second tap while the screen is open answers the first as cancelled
            self.waiting?.resolve(["cancelled": true])
            self.waiting = call

            let picker = CNContactPickerViewController()
            picker.delegate = self
            picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
            // Only people with a number can be chosen. Someone with one number is
            // chosen with one tap; someone with several shows them, to pick one.
            picker.predicateForEnablingContact = NSPredicate(format: "phoneNumbers.@count > 0")
            picker.predicateForSelectionOfContact = NSPredicate(format: "phoneNumbers.@count == 1")
            picker.predicateForSelectionOfProperty = NSPredicate(format: "key == 'phoneNumbers'")
            screen.present(picker, animated: true)
        }
    }

    public func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
        let number = contact.isKeyAvailable(CNContactPhoneNumbersKey) ? contact.phoneNumbers.first?.value : nil
        answer(contact, number: number)
    }

    public func contactPicker(_ picker: CNContactPickerViewController, didSelect contactProperty: CNContactProperty) {
        answer(contactProperty.contact, number: contactProperty.value as? CNPhoneNumber)
    }

    public func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
        waiting?.resolve(["cancelled": true])
        waiting = nil
    }

    private func answer(_ contact: CNContact, number: CNPhoneNumber?) {
        guard let call = waiting else { return }
        waiting = nil
        guard let phone = number?.stringValue, !phone.isEmpty else {
            call.resolve(["cancelled": true])
            return
        }
        call.resolve(["cancelled": false, "name": nameOf(contact), "phone": phone])
    }

    /// "Given Family", or the company for an entry that has only that. Each part
    /// is checked first: asking a contact for a part it was not handed stops the app.
    private func nameOf(_ contact: CNContact) -> String {
        var parts: [String] = []
        if contact.isKeyAvailable(CNContactGivenNameKey) { parts.append(contact.givenName) }
        if contact.isKeyAvailable(CNContactFamilyNameKey) { parts.append(contact.familyName) }
        let name = parts.filter { !$0.isEmpty }.joined(separator: " ")
        if !name.isEmpty { return name }
        return contact.isKeyAvailable(CNContactOrganizationNameKey) ? contact.organizationName : ""
    }
}
