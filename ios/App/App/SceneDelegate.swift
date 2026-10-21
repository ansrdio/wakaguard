import UIKit
import Capacitor

/// The app's window, under the scene life cycle that iOS 27 requires of apps
/// built with Xcode 27 (without it, build 24 closed as soon as it opened).
///
/// The window and its screen come from Main.storyboard, named for this scene
/// in Info.plist, so the screen is still MainViewController with WakaGuard's
/// own plugins. Capacitor's template makes a plain CAPBridgeViewController here
/// instead, which would leave out the contact picker.
///
/// Links that open the app now arrive here instead of AppDelegate, and are
/// passed to Capacitor the same way.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
