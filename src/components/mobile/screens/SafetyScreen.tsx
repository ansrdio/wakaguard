'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Users, AlertTriangle, Phone, X, Check, Loader2,
  ChevronRight, Heart, Car, Lightbulb, UserPlus, Trash2, CheckCircle2,
  AlertCircle, Flame, Ambulance, ShieldCheck, Plus,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useSafety } from '@/hooks/useSafety';
import { askToShowNotifications } from '@/lib/nativeNotifications';
import { MAX_TRUSTED_CONTACTS, joinNames } from '@/lib/tripPlanning';
import { reachedServer } from '@/lib/firestoreWrites';
import { StartTripForm, StartTripRequest } from '@/components/mobile/trip/StartTripForm';
import { ActiveTripCard } from '@/components/mobile/trip/ActiveTripCard';
import { 
  isValidE164, 
  formatToE164,
  sendCheckinSms,
  sendTripShareSms,
  buildShareLink,
  buildSosShareText,
  buildTripShareText,
  openWhatsAppShare,
} from '@/lib/safetyMessaging';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import { shareSafeTripLink } from '@/lib/share';
import { AuthModal } from '@/components/AuthModal';

type ModalType = 'sos' | 'contacts' | 'emergency' | null;

// Nigerian Emergency Numbers
const EMERGENCY_CONTACTS = [
  { name: 'General Emergency', number: '112', icon: Phone, color: 'red', description: 'National emergency line' },
  { name: 'Police', number: '199', icon: ShieldCheck, color: 'blue', description: 'Nigeria Police Force' },
  { name: 'FRSC', number: '122', icon: Car, color: 'green', description: 'Federal Road Safety Corps' },
  { name: 'Fire Service', number: '199', icon: Flame, color: 'orange', description: 'Fire emergency' },
  { name: 'Ambulance (LASAMBUS)', number: '112', icon: Ambulance, color: 'red', description: 'Lagos State Ambulance' },
  { name: 'NEMA', number: '0800CALLNEMA', icon: AlertCircle, color: 'amber', description: 'Emergency Management Agency' },
];

// Safety Tips
const SAFETY_TIPS = [
  {
    title: 'Before Your Trip',
    tips: [
      'Check your vehicle\'s tires, brakes, and lights',
      'Ensure you have enough fuel for your journey',
      'Share your travel plans with family or friends',
      'Check weather and road conditions',
      'Carry a fully charged phone and car charger',
    ]
  },
  {
    title: 'While Driving',
    tips: [
      'Always wear your seatbelt',
      'Avoid using your phone while driving',
      'Maintain safe following distance',
      'Obey speed limits and traffic signs',
      'Take breaks every 2 hours on long trips',
    ]
  },
  {
    title: 'Night Driving',
    tips: [
      'Ensure all lights are working properly',
      'Reduce speed and increase following distance',
      'Avoid staring at oncoming headlights',
      'Be extra cautious at intersections',
      'If tired, pull over and rest',
    ]
  },
  {
    title: 'Emergency Situations',
    tips: [
      'Stay calm and pull over safely if possible',
      'Turn on hazard lights immediately',
      'Call emergency services (112)',
      'Don\'t leave your vehicle unless necessary',
      'Use WakaGuard to report and alert others',
    ]
  },
];

// Road Safety Checklist
const SAFETY_CHECKLIST = [
  { id: 'tires', label: 'Checked tire pressure and condition', category: 'Vehicle' },
  { id: 'brakes', label: 'Tested brakes', category: 'Vehicle' },
  { id: 'lights', label: 'All lights working', category: 'Vehicle' },
  { id: 'fuel', label: 'Sufficient fuel', category: 'Vehicle' },
  { id: 'documents', label: 'License and registration available', category: 'Documents' },
  { id: 'insurance', label: 'Valid insurance', category: 'Documents' },
  { id: 'phone', label: 'Phone fully charged', category: 'Emergency' },
  { id: 'contacts', label: 'Emergency contacts updated', category: 'Emergency' },
  { id: 'firstaid', label: 'First aid kit available', category: 'Emergency' },
  { id: 'water', label: 'Water and snacks for long trips', category: 'Comfort' },
];

export function SafetyScreen() {
  const { uid, isAnonymous, displayName } = useAuthedUser();
  const { requireAccount, showAuthModal, openAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const {
    activeTrip,
    activeTripUnsynced,
    startSafeTrip,
    endSafeTrip,
    extendSafeTrip,
    triggerSOS,
    logCheckpointStop,
    loading,
  } = useSafety();

  // Derived from the trip so the share options survive an app restart mid-trip
  const shareUrl = activeTrip ? buildShareLink(activeTrip.id) : null;

  // Starting or ending a trip swaps what is at the top of the screen, so bring it back into view
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTripId = activeTrip?.id ?? null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTripId]);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Name shown to contacts in alerts; null until the user document has loaded
  const [savedAlertName, setSavedAlertName] = useState<string | null>(null);

  // Trusted contacts
  const [trustedContacts, setTrustedContacts] = useState<{ id: string; name: string; phone?: string; phoneE164: string; email?: string }[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [phoneContacts, setPhoneContacts] = useState<{ name: string; phone: string }[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  
  // Collapsible sections
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  
  // Load trusted contacts
  useEffect(() => {
    if (!uid || isAnonymous) return;
    // Each part is loaded on its own: with no connection and nothing cached a
    // read fails, and that must not leave the form stuck on its loading state
    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setCheckedItems(userDoc.data().safetyChecklist || []);
        }
        setSavedAlertName(userDoc.data()?.alertName || '');
      } catch (error) {
        console.warn('Could not load profile:', error);
        setSavedAlertName('');
      }
    };
    const loadContacts = async () => {
      try {
        const contactsSnap = await getDocs(collection(db, 'users', uid, 'trustedContacts'));
        const contacts = contactsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setTrustedContacts(contacts);
      } catch (error) {
        console.warn('Could not load trusted contacts:', error);
      }
    };
    loadProfile();
    loadContacts();
  }, [uid]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Get current location for SMS/WhatsApp
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn('Could not get location for safety messaging')
      );
    }
  }, []);

  // Call 112. Works for everyone, signed in or not; when signed in the server
  // also messages trusted contacts.
  const handleSOS = async () => {
    setProcessing(true);
    const result = await triggerSOS();
    setProcessing(false);
    setActiveModal(null);
    const willAlertContacts = !!uid && !isAnonymous && trustedContacts.length > 0;
    showToast(
      willAlertContacts && result.success
        ? 'Calling 112. Your contacts are being alerted.'
        : 'Calling 112.',
      'success'
    );
  };

  // Alert trusted contacts without placing a call
  const handleSosContactsOnly = async () => {
    if (!requireAccount('alert contacts')) return;
    if (!uid || isAnonymous) return;
    if (trustedContacts.length === 0) {
      showToast('No trusted contacts. Add contacts first.', 'error');
      return;
    }

    setProcessing(true);
    const result = await triggerSOS({ call: false });
    setProcessing(false);
    setActiveModal(null);
    showToast(
      result.confirmed
        ? 'Your contacts are being alerted by SMS.'
        : 'Alert saved. It will send as soon as your phone has signal.',
      'success'
    );
  };

  // Send check-in SMS to trusted contacts
  const handleCheckinSms = async () => {
    if (!requireAccount('send check-in SMS')) return;
    if (!uid || isAnonymous) return;
    if (trustedContacts.length === 0) {
      showToast('No trusted contacts. Add contacts first.', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      const result = await sendCheckinSms(undefined, currentLocation?.lat, currentLocation?.lng) as any;
      if (result.success) {
        showToast(`Text sent to ${result.sent} ${result.sent === 1 ? 'contact' : 'contacts'}`, 'success');
      } else if (result.status === 'blocked') {
        showToast(result.message || 'SMS not available yet. Use WhatsApp instead.', 'error');
      } else {
        showToast('Failed to send check-in SMS', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send check-in SMS', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Share via WhatsApp (SOS)
  const handleSosWhatsApp = () => {
    if (!currentLocation) {
      showToast('Location unavailable. Please enable location.', 'error');
      return;
    }
    const text = buildSosShareText(currentLocation.lat, currentLocation.lng);
    openWhatsAppShare(text);
  };

  // Share via WhatsApp (Trip)
  const handleTripWhatsApp = () => {
    if (!activeTrip) {
      showToast('Start a Safe Trip first.', 'error');
      return;
    }
    const text = buildTripShareText(activeTrip.id);
    openWhatsAppShare(text);
  };

  const handleStartTrip = async (request: StartTripRequest) => {
    if (!requireAccount('start safe trip')) return;
    if (!uid || isAnonymous) return;
    setProcessing(true);

    // The name goes into texts to contacts, so save it before the trip exists.
    // The trip still starts if this fails; the server falls back to the sign-in name.
    // It is not waited for: with no connection the save stays queued, and waiting
    // on it would hold up the trip itself.
    if (request.alertName !== savedAlertName) {
      setSavedAlertName(request.alertName);
      updateDoc(doc(db, 'users', uid), { alertName: request.alertName })
        .catch((error) => console.error('Failed to save alert name:', error));
    }

    // First trip only: the "Safe Trip active" notification and the warning that
    // comes before contacts are alerted both need this. Asked before the trip
    // starts so it cannot collide with the location prompt that follows.
    await askToShowNotifications();

    const result = await startSafeTrip({
      expectedDurationMinutes: request.durationMinutes,
      destinationLabel: request.destination,
      trustedContactIds: request.contactIds,
    });

    if (!result.success || !result.tripId) {
      setProcessing(false);
      showToast(result.error || 'Failed to start Safe Trip', 'error');
      return;
    }

    // No connection: the trip is saved on the phone and sent when it can be.
    // Until then nobody is watching it, and the card says so.
    if (result.pending) {
      setProcessing(false);
      showToast('No connection yet. This trip starts being watched once your phone is back online.', 'error');
      return;
    }

    const watchers = joinNames(
      trustedContacts.filter((c) => request.contactIds.includes(c.id)).map((c) => c.name)
    );

    if (!request.textContacts) {
      setProcessing(false);
      showToast('Trip started. Share the link so your contacts can follow it.', 'success');
      return;
    }

    try {
      const sms = await sendTripShareSms(result.tripId);
      showToast(
        sms.success
          ? `Trip started. ${watchers} ${request.contactIds.length === 1 ? 'was' : 'were'} sent the link.`
          : 'Trip started, but the text could not be sent. Share the link below instead.',
        sms.success ? 'success' : 'error'
      );
    } catch (error) {
      console.error('Trip share SMS failed:', error);
      showToast('Trip started, but the text could not be sent. Share the link below instead.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleEndSafeTrip = async () => {
    if (!requireAccount('end safe trip')) return;
    if (!uid || isAnonymous) return;
    const currentShareUrl = shareUrl;
    const currentDestination = activeTrip?.destination;
    const wasAlerted = !!activeTrip?.overdueAt || activeTrip?.status === 'emergency';
    
    setProcessing(true);
    const result = await endSafeTrip();
    setProcessing(false);
    setActiveModal(null);
    
    if (result.success && result.pending) {
      showToast('Saved on this phone. Until it is back online, your contacts could still be alerted.', 'error');
    } else if (result.success) {
      showToast(
        wasAlerted
          ? 'Trip ended. Your contacts are being told you checked in.'
          : 'Trip ended. Glad you made it.',
        'success'
      );
      // Contacts who were alerted get a text from the server. Otherwise offer
      // to let them know through the share sheet.
      if (currentShareUrl && !wasAlerted && !result.pending) {
        try {
          await shareSafeTripLink(currentShareUrl, { mode: 'end', destination: currentDestination });
        } catch (e) {
          console.warn('End trip share cancelled:', e);
        }
      }
    } else {
      showToast(result.error || 'Failed to end trip', 'error');
    }
  };

  const handleExtendTrip = async (minutes: number) => {
    if (!uid || isAnonymous) return;
    setProcessing(true);
    const result = await extendSafeTrip(minutes);
    setProcessing(false);
    if (result.success && result.pending) {
      showToast('Saved on this phone. The extra time applies once you are back online.', 'error');
    } else if (result.success) {
      showToast(`Added ${minutes} minutes`, 'success');
    } else {
      showToast(result.error || 'Failed to add time', 'error');
    }
  };

  const handleShareLink = async () => {
    if (!shareUrl) return;
    try {
      await shareSafeTripLink(shareUrl, { mode: 'start', destination: activeTrip?.destination });
    } catch (e) {
      console.warn('Share cancelled/failed:', e);
    }
  };

  const handleCheckpointStop = async () => {
    if (!requireAccount('checkpoint stop')) return;
    if (!uid || isAnonymous) return;
    setProcessing(true);
    const result = await logCheckpointStop();
    setProcessing(false);
    if (result.success) {
      showToast('Checkpoint stop logged.', 'success');
    } else {
      showToast(result.error || 'Failed to log checkpoint', 'error');
    }
  };

  // Pick contact from phone
  const handlePickFromPhone = async () => {
    // DIAGNOSTIC: Check platform detection
    console.log('platform:', Capacitor.getPlatform());
    console.log('isNativePlatform:', Capacitor.isNativePlatform());

    // Try Capacitor Contacts plugin first on native
    if (Capacitor.isNativePlatform()) {
      setProcessing(true);
      try {
        const { Contacts } = await import('@capacitor-community/contacts');
        
        // Request permission and check result
        const perm = await Contacts.requestPermissions();
        console.log('Permission result:', perm);
        
        if (perm.contacts !== 'granted') {
          showToast('Contacts permission denied. Please enable in Settings.', 'error');
          setProcessing(false);
          return;
        }
        
        // Get all contacts
        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
          }
        });
        console.log('Got contacts:', result.contacts?.length);

        if (result.contacts && result.contacts.length > 0) {
          // Filter contacts with phone numbers and map to simple format
          const contactsWithPhones: { name: string; phone: string }[] = result.contacts
            .filter((c: any) => c.phones && c.phones.length > 0)
            .map((c: any) => ({
              name: c.name?.display || c.name?.given || 'Unknown',
              phone: c.phones![0].number || ''
            }))
            .filter((c: any) => c.phone)
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
          
          setPhoneContacts(contactsWithPhones);
          setShowContactPicker(true);
          setContactSearch('');
        } else {
          showToast('No contacts found', 'error');
        }
      } catch (error: any) {
        console.error('Contacts error:', error);
        showToast(`Contact error: ${error.message || 'Unknown'}`, 'error');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Web fallback: Try Web Contact Picker API (Chrome on Android)
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        // @ts-ignore - Web Contacts API
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          const name = contact.name?.[0] || 'Unknown';
          const phone = contact.tel?.[0] || '';
          if (phone) {
            setNewContactName(name);
            setNewContactPhone(phone.replace(/\s/g, ''));
            showToast('Contact selected - tap Add to save', 'success');
          } else {
            showToast('Selected contact has no phone number', 'error');
          }
        }
        return;
      } catch (error: any) {
        if (!error.message?.includes('canceled') && !error.message?.includes('cancelled')) {
          console.warn('Web Contact Picker failed');
        } else {
          return; // User cancelled
        }
      }
    }

    // Final fallback - manual input
    showToast('Enter contact details manually below', 'success');
  };

  // Add trusted contact
  const handleAddContact = async () => {
    if (!requireAccount('add trusted contact')) return;
    if (!uid || isAnonymous || !newContactName.trim() || !newContactPhone.trim()) {
      showToast('Please enter name and phone number', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      const name = newContactName.trim();
      const rawPhone = newContactPhone.trim();
      
      // Convert to E.164 format (default Nigeria +234)
      const phoneE164 = formatToE164(rawPhone, '+234');
      
      // Validate E.164 format
      if (!isValidE164(phoneE164)) {
        showToast('Invalid phone format. Use +234... or 0...', 'error');
        setProcessing(false);
        return;
      }
      
      const contactIdBase = phoneE164.replace(/[^0-9]/g, '');
      const contactId = contactIdBase.length > 0 ? contactIdBase : String(Date.now());

      // The server messages at most this many contacts per alert
      const isNewContact = !trustedContacts.some((c) => c.id === contactId);
      if (isNewContact && trustedContacts.length >= MAX_TRUSTED_CONTACTS) {
        showToast(`You can have up to ${MAX_TRUSTED_CONTACTS} trusted contacts. Remove one to add another.`, 'error');
        setProcessing(false);
        return;
      }

      const saved = await reachedServer(setDoc(doc(db, 'users', uid, 'trustedContacts', contactId), {
        name,
        phone: rawPhone,
        phoneE164,
        notifyOnSOS: true,
        notifyOnCheckIn: true,
        notifyOnTripShare: true,
        createdAt: serverTimestamp(),
      }, { merge: true }));

      setTrustedContacts((prev) => {
        const existing = prev.find((c) => c.id === contactId);
        if (existing) {
          return prev.map((c) => (c.id === contactId ? { ...c, name, phone: rawPhone, phoneE164 } : c));
        }
        return [...prev, { id: contactId, name, phone: rawPhone, phoneE164 }];
      });
      setNewContactName('');
      setNewContactPhone('');
      showToast(
        saved ? 'Contact added' : 'Contact saved on this phone. It will be sent when you are back online.',
        saved ? 'success' : 'error'
      );
    } catch (error) {
      showToast('Failed to add contact', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Remove trusted contact
  const handleRemoveContact = async (contact: { id: string; name: string; phone?: string; phoneE164: string }) => {
    if (!requireAccount('remove trusted contact')) return;
    if (!uid || isAnonymous) return;
    
    setProcessing(true);
    try {
      await deleteDoc(doc(db, 'users', uid, 'trustedContacts', contact.id));
      setTrustedContacts((prev) => prev.filter((c) => c.id !== contact.id));
      showToast('Contact removed', 'success');
    } catch (error) {
      showToast('Failed to remove contact', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle checklist item
  const handleToggleChecklist = async (itemId: string) => {
    if (!requireAccount('update checklist')) return;
    if (!uid || isAnonymous) return;
    
    const newChecked = checkedItems.includes(itemId)
      ? checkedItems.filter(id => id !== itemId)
      : [...checkedItems, itemId];
    
    setCheckedItems(newChecked);
    
    try {
      await updateDoc(doc(db, 'users', uid), {
        safetyChecklist: newChecked
      });
    } catch (error) {
      console.error('Failed to save checklist:', error);
    }
  };

  // Reset checklist
  const handleResetChecklist = async () => {
    if (!requireAccount('reset checklist')) return;
    if (!uid || isAnonymous) return;
    setCheckedItems([]);
    try {
      await updateDoc(doc(db, 'users', uid), {
        safetyChecklist: []
      });
      showToast('Checklist reset', 'success');
    } catch (error) {
      showToast('Failed to reset', 'error');
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
      </div>
    );
  }

  // Show login prompt for guests
  if (!uid || isAnonymous) {
    return (
      <div className="absolute inset-0 overflow-y-auto px-4 pt-20 pb-28 bg-slate-50 dark:bg-slate-900" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Safe Trip</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6 px-4">
            Start a trip and say when you should arrive. If you don&apos;t, the people you chose get a text with
            your last location. Sign in to use it.
          </p>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In to Continue
          </button>
        </div>

        {/* Emergency Numbers - Always Available */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 px-2">Emergency Numbers</h2>
          <div className="grid grid-cols-2 gap-3">
            {EMERGENCY_CONTACTS.slice(0, 4).map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number}`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 bg-${contact.color}-100`}>
                  <Phone className={`w-6 h-6 text-${contact.color}-600`} />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{contact.name}</p>
                <p className="text-blue-600 font-bold">{contact.number}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Without this the sign-in button above has nothing to open */}
        <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
      </div>
    );
  }

  // Contacts told about the active trip (all of them for trips started before contacts could be chosen)
  const tripContactIds = activeTrip?.trustedContactIds;
  const watcherNames = trustedContacts
    .filter((c) => !tripContactIds || tripContactIds.length === 0 || tripContactIds.includes(c.id))
    .map((c) => c.name);

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto px-4 pt-4 pb-28 space-y-4 bg-slate-50 dark:bg-slate-900 touch-pan-y" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 56px)', WebkitOverflowScrolling: 'touch' }}>
      {/* ============================================ */}
      {/* 1. THE TRIP: start form, or the trip in progress */}
      {/* ============================================ */}
      {activeTrip ? (
        <ActiveTripCard
          trip={activeTrip}
          watcherNames={watcherNames}
          unsynced={activeTripUnsynced}
          processing={processing}
          onArrive={handleEndSafeTrip}
          onExtend={handleExtendTrip}
          onShare={handleShareLink}
          onWhatsApp={handleTripWhatsApp}
          onTextOkay={handleCheckinSms}
          onSOS={() => setActiveModal('sos')}
        />
      ) : savedAlertName === null ? (
        <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : (
        <StartTripForm
          contacts={trustedContacts}
          alertName={savedAlertName || displayName || ''}
          alertNameSaved={!!savedAlertName}
          processing={processing}
          onStart={handleStartTrip}
          newContactName={newContactName}
          newContactPhone={newContactPhone}
          onNewContactNameChange={setNewContactName}
          onNewContactPhoneChange={setNewContactPhone}
          onAddContact={handleAddContact}
          onPickFromPhone={handlePickFromPhone}
          onManageContacts={() => setActiveModal('contacts')}
        />
      )}

      {/* ============================================ */}
      {/* 2. EMERGENCY SOS (the trip card has its own while a trip is running) */}
      {/* ============================================ */}
      {!activeTrip && (
      <button
        onClick={() => setActiveModal('sos')}
        className="w-full p-5 bg-red-50 border-2 border-red-200 rounded-2xl text-left hover:border-red-300 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900">Emergency SOS</h3>
            <p className="text-sm text-red-700">Call 112 and alert your contacts. Use only in danger.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400" />
        </div>
      </button>
      )}

      {/* ============================================ */}
      {/* 3. CHECKPOINT QUICK ACTION (Nigeria-specific) */}
      {/* ============================================ */}
      <button
        onClick={handleCheckpointStop}
        disabled={processing}
        className="w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left hover:border-amber-300 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Stopped at a checkpoint?</h3>
            <p className="text-xs text-slate-600">Tap to log it with your location</p>
          </div>
          {processing ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
        </div>
      </button>

      {/* ============================================ */}
      {/* 4. QUICK ACTIONS ROW */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Emergency Numbers */}
        <button
          onClick={() => setActiveModal('emergency')}
          className="p-4 bg-white border-2 border-slate-200 rounded-2xl text-left hover:border-red-300 transition-colors"
        >
          <Phone className="w-7 h-7 text-red-600 mb-2" />
          <h3 className="font-semibold text-slate-900 text-sm">Emergency Numbers</h3>
          <p className="text-xs text-slate-500">Nigeria hotlines</p>
        </button>

        {/* Trusted Contacts */}
        <button
          onClick={() => setActiveModal('contacts')}
          className="p-4 bg-white border-2 border-slate-200 rounded-2xl text-left hover:border-purple-300 transition-colors"
        >
          <Heart className="w-7 h-7 text-purple-600 mb-2" />
          <h3 className="font-semibold text-slate-900 text-sm">Trusted Contacts</h3>
          <p className="text-xs text-slate-500">{trustedContacts.length} saved</p>
        </button>
      </div>

      {/* ============================================ */}
      {/* 5. TIPS & CHECKLIST (Collapsible) */}
      {/* ============================================ */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setTipsExpanded(!tipsExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">Safety Tips & Checklist</h3>
              <p className="text-xs text-slate-500">{checkedItems.length}/{SAFETY_CHECKLIST.length} items checked</p>
            </div>
          </div>
          {tipsExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {tipsExpanded && (
          <div className="border-t border-slate-200 p-4 space-y-4">
            {/* Quick Checklist */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Pre-Trip Checklist</h4>
              <div className="space-y-2">
                {SAFETY_CHECKLIST.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                      checkedItems.includes(item.id)
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      checkedItems.includes(item.id) ? 'bg-green-600 border-green-600' : 'border-slate-300'
                    }`}>
                      {checkedItems.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${checkedItems.includes(item.id) ? 'text-green-800' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Safety Tips Summary */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Quick Tips</h4>
              <ul className="space-y-2">
                {SAFETY_TIPS[0].tips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* SOS Modal */}
      {activeModal === 'sos' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Emergency SOS</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full bg-slate-100">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-red-600" />
              </div>
              <p className="text-slate-600 mb-4">
                {trustedContacts.length > 0
                  ? 'This calls emergency services (112) and alerts your trusted contacts by SMS with your location.'
                  : 'This calls emergency services (112). Add trusted contacts so they are alerted too.'}
              </p>
            </div>
            <button
              onClick={handleSOS}
              disabled={processing}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
              Call 112 Now
            </button>
            
            <div className="border-t border-slate-200 pt-4 mt-4">
              <p className="text-xs text-slate-500 mb-3 text-center">If a call is not safe, alert your contacts without calling:</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSosContactsOnly}
                  disabled={processing || trustedContacts.length === 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  📱 Alert by SMS
                </button>
                <button
                  onClick={handleSosWhatsApp}
                  disabled={!currentLocation}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  💬 WhatsApp
                </button>
              </div>
              {trustedContacts.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center">Add trusted contacts to enable SMS alerts</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Numbers Modal */}
      {activeModal === 'emergency' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Emergency Numbers</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full bg-slate-100">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              {EMERGENCY_CONTACTS.map((contact, index) => {
                const IconComponent = contact.icon;
                return (
                  <a
                    key={index}
                    href={`tel:${contact.number}`}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${contact.color}-100`}>
                      <IconComponent className={`w-6 h-6 text-${contact.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                      <p className="text-xs text-slate-500">{contact.description}</p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{contact.number}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Trusted Contacts Modal */}
      {activeModal === 'contacts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Trusted Contacts</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full bg-slate-100">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="text-sm text-slate-600">These contacts will be notified in emergencies and can track your trips.</p>
              
              {/* Add Contact Form */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                {/* Pick from Phone Button */}
                <button
                  onClick={handlePickFromPhone}
                  disabled={processing}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Pick from Phone Contacts
                </button>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-slate-300"></div>
                  <span className="text-xs text-slate-500">or enter manually</span>
                  <div className="flex-1 border-t border-slate-300"></div>
                </div>

                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={handleAddContact}
                  disabled={processing || !newContactName || !newContactPhone}
                  className="w-full py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Contact
                </button>
              </div>

              {/* Contact List */}
              {trustedContacts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Heart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No trusted contacts yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trustedContacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.phoneE164 || contact.phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveContact(contact)}
                        disabled={processing}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phone Contacts Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Select Contact</h2>
              <button onClick={() => setShowContactPicker(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100">
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {phoneContacts
                .filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
                .map((contact, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setNewContactName(contact.name);
                      setNewContactPhone(contact.phone.replace(/\s/g, ''));
                      setShowContactPicker(false);
                      showToast('Contact selected - tap Add to save', 'success');
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-left"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.phone}</p>
                    </div>
                  </button>
                ))}
              {phoneContacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch)).length === 0 && (
                <p className="text-center text-slate-500 py-8">No contacts found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div className={`p-4 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          } text-white text-sm font-medium text-center`}>
            {toast.message}
          </div>
        </div>
      )}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
    </div>
  );
}
