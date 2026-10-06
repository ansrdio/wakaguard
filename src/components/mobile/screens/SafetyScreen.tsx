'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, Clock, Users, AlertTriangle, Phone, X, Share2, Check, Loader2, MapPin,
  ChevronRight, Heart, Car, Lightbulb, UserPlus, Trash2, Bell, CheckCircle2,
  FileText, AlertCircle, Flame, Ambulance, ShieldCheck, Plus, Moon, Navigation,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useSafety } from '@/hooks/useSafety';
import { 
  formatTripRemainingTime, 
  getSafeTripTimeStatus, 
  SAFE_TRIP_DURATION_PRESETS,
  isNightTime 
} from '@/lib/safety';
import { 
  isValidE164, 
  formatToE164,
  sendSosSms,
  sendCheckinSms,
  sendTripShareSms,
  buildSosShareText,
  buildCheckinShareText,
  buildTripShareText,
  openWhatsAppShare,
  openWhatsAppChat,
} from '@/lib/safetyMessaging';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import { shareSafeTripLink } from '@/lib/share';
import { AuthModal } from '@/components/AuthModal';

type ModalType = 'sos' | 'safetrip' | 'contacts' | 'emergency' | null;

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
  const { uid, isAnonymous } = useAuthedUser();
  const { requireAccount, showAuthModal, openAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const {
    activeTrip,
    activeTimer,
    startSafeTrip,
    endSafeTrip,
    extendSafeTrip,
    acknowledgeSafeTripTimer,
    sendQuickCheckIn,
    triggerSOS,
    logCheckpointStop,
    loading,
  } = useSafety();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  
  // Safe Trip configuration
  const [selectedDuration, setSelectedDuration] = useState(45);
  const [destination, setDestination] = useState('');
  
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
  
  // Remaining time display
  const [remainingTime, setRemainingTime] = useState('');
  
  // Load trusted contacts
  useEffect(() => {
    if (!uid || isAnonymous) return;
    const loadContacts = async () => {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setCheckedItems(userDoc.data().safetyChecklist || []);
      }

      const contactsSnap = await getDocs(collection(db, 'users', uid, 'trustedContacts'));
      const contacts = contactsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setTrustedContacts(contacts);
    };
    loadContacts();
  }, [uid]);

  // Update remaining time display for active trip
  useEffect(() => {
    if (!activeTrip?.endsAt) {
      setRemainingTime('');
      return;
    }

    const updateDisplay = () => {
      setRemainingTime(formatTripRemainingTime(activeTrip.endsAt));
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [activeTrip?.endsAt]);

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

  const handleSOS = async () => {
    if (!requireAccount('sos')) return;
    if (!uid || isAnonymous) return;
    setProcessing(true);
    const result = await triggerSOS();
    setProcessing(false);
    setActiveModal(null);
    if (result.success) {
      showToast('Emergency services contacted', 'success');
    } else {
      showToast(result.error || 'Failed to trigger SOS', 'error');
    }
  };

  // Send SOS SMS to trusted contacts
  const handleSosSms = async () => {
    if (!requireAccount('send SOS SMS')) return;
    if (!uid || isAnonymous) return;
    if (trustedContacts.length === 0) {
      showToast('No trusted contacts. Add contacts first.', 'error');
      return;
    }
    if (!currentLocation) {
      showToast('Location unavailable. Please enable location.', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      const result = await sendSosSms(currentLocation.lat, currentLocation.lng) as any;
      if (result.success) {
        showToast(`SOS SMS sent to ${result.sent} contact(s)`, 'success');
      } else if (result.status === 'blocked') {
        showToast(result.message || 'SMS not available yet. Use WhatsApp instead.', 'error');
      } else {
        showToast('Failed to send SOS SMS', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send SOS SMS', 'error');
    } finally {
      setProcessing(false);
    }
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
      const result = await sendCheckinSms("I'm checking in safely.", currentLocation?.lat, currentLocation?.lng) as any;
      if (result.success) {
        showToast(`Check-in SMS sent to ${result.sent} contact(s)`, 'success');
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

  // Send trip share SMS to trusted contacts
  const handleTripShareSms = async () => {
    if (!requireAccount('send trip share SMS')) return;
    if (!uid || isAnonymous) return;
    if (!shareUrl) {
      showToast('Start a Safe Trip first.', 'error');
      return;
    }
    if (trustedContacts.length === 0) {
      showToast('No trusted contacts. Add contacts first.', 'error');
      return;
    }
    
    // Extract token from shareUrl
    const token = shareUrl.split('/').pop() || '';
    
    setProcessing(true);
    try {
      const result = await sendTripShareSms(token, currentLocation?.lat, currentLocation?.lng) as any;
      if (result.success) {
        showToast(`Trip share SMS sent to ${result.sent} contact(s)`, 'success');
      } else if (result.status === 'blocked') {
        showToast(result.message || 'SMS not available yet. Use WhatsApp instead.', 'error');
      } else {
        showToast('Failed to send trip share SMS', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send trip share SMS', 'error');
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

  // Share via WhatsApp (Check-in)
  const handleCheckinWhatsApp = () => {
    const text = buildCheckinShareText("I'm checking in safely.", currentLocation?.lat, currentLocation?.lng);
    openWhatsAppShare(text);
  };

  // Share via WhatsApp (Trip)
  const handleTripWhatsApp = () => {
    if (!shareUrl) {
      showToast('Start a Safe Trip first.', 'error');
      return;
    }
    const token = shareUrl.split('/').pop() || '';
    const text = buildTripShareText(token);
    openWhatsAppShare(text);
  };

  const handleStartSafeTrip = async () => {
    if (!requireAccount('start safe trip')) return;
    if (!uid || isAnonymous) return;
    setProcessing(true);
    const result = await startSafeTrip({
      expectedDurationMinutes: selectedDuration > 0 ? selectedDuration : undefined,
      destinationLabel: destination || undefined,
      trustedContactIds: trustedContacts.map(c => c.id),
    });
    setProcessing(false);
    if (result.success && result.shareUrl) {
      setShareUrl(result.shareUrl);
      showToast('Safe Trip started. Tap "Share Link" to notify contacts.', 'success');
      // Don't auto-open share sheet - let user tap Share Link button
    } else {
      showToast(result.error || 'Failed to start Safe Trip', 'error');
      setActiveModal(null);
    }
  };

  const handleEndSafeTrip = async () => {
    if (!requireAccount('end safe trip')) return;
    if (!uid || isAnonymous) return;
    const currentShareUrl = shareUrl;
    const currentDestination = activeTrip?.destination;
    
    setProcessing(true);
    const result = await endSafeTrip();
    setProcessing(false);
    setActiveModal(null);
    setShareUrl(null);
    
    if (result.success) {
      showToast('Trip ended. You can notify your contacts.', 'success');
      // Offer to share "trip ended" notification
      if (currentShareUrl) {
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
    if (result.success) {
      showToast(`Added ${minutes} minutes`, 'success');
    } else {
      showToast(result.error || 'Failed to add time', 'error');
    }
  };

  const handleCheckIn = async () => {
    if (!requireAccount('check in')) return;
    if (!uid || isAnonymous) return;
    setProcessing(true);
    const result = await acknowledgeSafeTripTimer();
    setProcessing(false);
    if (result.success) {
      showToast('Checked in safely!', 'success');
    } else {
      showToast(result.error || 'Failed to check in', 'error');
    }
  };

  const handleQuickCheckIn = async () => {
    if (!requireAccount('quick check-in')) return;
    if (!uid || isAnonymous) return;
    if (!shareUrl) {
      showToast('Start a Safe Trip first.', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      await shareSafeTripLink(shareUrl, {
        mode: 'checkin',
        destination: activeTrip?.destination,
      });
      showToast('Check-in ready to share.', 'success');
    } catch (e) {
      // User cancel is normal; do not show failure
      console.warn('Check-in share cancelled/failed:', e);
    } finally {
      setProcessing(false);
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
      showToast('Checkpoint stop logged. Your contacts will be notified in a future update.', 'success');
    } else {
      showToast(result.error || 'Failed to log checkpoint', 'error');
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Track My Safe Trip',
          text: 'Follow my trip in real-time for safety',
          url: shareUrl,
        });
      } catch (err) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard', 'success');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied to clipboard', 'success');
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

      await setDoc(doc(db, 'users', uid, 'trustedContacts', contactId), {
        name,
        phone: rawPhone,
        phoneE164,
        notifyOnSOS: true,
        notifyOnCheckIn: true,
        notifyOnTripShare: true,
        createdAt: serverTimestamp(),
      }, { merge: true });

      setTrustedContacts((prev) => {
        const existing = prev.find((c) => c.id === contactId);
        if (existing) {
          return prev.map((c) => (c.id === contactId ? { ...c, name, phone: rawPhone, phoneE164 } : c));
        }
        return [...prev, { id: contactId, name, phone: rawPhone, phoneE164 }];
      });
      setNewContactName('');
      setNewContactPhone('');
      showToast('Contact added', 'success');
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Safety Center</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6 px-4">
            Sign in to access safety features like trip sharing, safety timers, and emergency contacts.
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
      </div>
    );
  }

  // Determine trip status for UI
  const tripTimeStatus = activeTrip?.endsAt ? getSafeTripTimeStatus(activeTrip.endsAt) : 'active';
  const isNight = isNightTime();

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pt-20 pb-28 space-y-4 bg-slate-50 dark:bg-slate-900 touch-pan-y" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 56px)', WebkitOverflowScrolling: 'touch' }}>
      {/* Header */}
      <div className="text-center mb-2">
        <Shield className="w-12 h-12 text-blue-600 mx-auto mb-2" />
        <h1 className="text-xl font-bold text-slate-900">Safety Center</h1>
      </div>

      {/* ============================================ */}
      {/* 1. SAFE TRIP - Primary CTA */}
      {/* ============================================ */}
      {activeTrip ? (
        // Active Safe Trip Card
        <div className={`rounded-3xl p-5 border-2 ${
          tripTimeStatus === 'endingSoon' 
            ? 'bg-amber-50 border-amber-300' 
            : 'bg-emerald-50 border-emerald-300'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                tripTimeStatus === 'endingSoon' ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                <Navigation className={`w-6 h-6 ${
                  tripTimeStatus === 'endingSoon' ? 'text-amber-600' : 'text-emerald-600'
                }`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Safe Trip Active</h2>
                <p className="text-sm text-slate-600">{activeTrip.destination || 'Trip in progress'}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              tripTimeStatus === 'endingSoon' 
                ? 'bg-amber-200 text-amber-800' 
                : 'bg-emerald-200 text-emerald-800'
            }`}>
              {remainingTime || 'No limit'}
            </div>
          </div>

          {/* Trip Info */}
          <div className="flex items-center gap-4 mb-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{trustedContacts.length} contacts</span>
            </div>
            {activeTrip.lastLocation && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>Location sharing</span>
              </div>
            )}
          </div>

          {/* Share URL */}
          {shareUrl && (
            <div className="bg-white/60 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-500 mb-2">Send this link to your trusted contacts:</p>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleShareLink}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Link
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    showToast('Link copied!', 'success');
                  }}
                  className="py-2.5 px-4 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 flex items-center justify-center"
                >
                  Copy
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleTripShareSms}
                  disabled={processing || trustedContacts.length === 0}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  📱 SMS Contacts
                </button>
                <button
                  onClick={handleTripWhatsApp}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center justify-center gap-1"
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>
          )}

          {/* Overdue / deadline notice */}
          {activeTrip.endsAt && tripTimeStatus === 'expired' && (
            <div className="bg-red-100 border border-red-300 rounded-xl p-3 mb-4 text-sm text-red-800">
              {activeTrip.overdueAt
                ? 'Your contacts have been alerted that you are overdue. Add time or end the trip to let them know you are okay.'
                : 'Your expected arrival time has passed. Add time or end the trip, or your contacts will be alerted.'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {activeTrip.endsAt && (
              <button
                onClick={() => handleExtendTrip(30)}
                disabled={processing}
                className="flex-1 py-3 bg-white text-slate-800 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                +30 min
              </button>
            )}
            {activeTimer && (
              <button
                onClick={handleCheckIn}
                disabled={processing}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                I'm Safe
              </button>
            )}
            <button
              onClick={handleEndSafeTrip}
              disabled={processing}
              className={`${activeTimer || activeTrip.endsAt ? 'flex-1' : 'w-full'} py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              End Trip
            </button>
          </div>
          
          {/* Quick Check-in Notifications */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCheckinSms}
              disabled={processing || trustedContacts.length === 0}
              className="flex-1 py-2 bg-white/80 text-indigo-700 rounded-lg text-xs font-medium hover:bg-white disabled:opacity-50 flex items-center justify-center gap-1"
            >
              📱 Check-in SMS
            </button>
            <button
              onClick={handleCheckinWhatsApp}
              className="flex-1 py-2 bg-white/80 text-green-700 rounded-lg text-xs font-medium hover:bg-white flex items-center justify-center gap-1"
            >
              💬 Check-in WhatsApp
            </button>
          </div>
        </div>
      ) : (
        // Start Safe Trip Card
        <button
          onClick={() => setActiveModal('safetrip')}
          className="w-full rounded-3xl p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-left hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Navigation className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Start Safe Trip</h2>
              <p className="text-blue-100 text-sm">
                Share your route, set a backup timer, and keep trusted contacts in the loop.
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-blue-200 flex-shrink-0" />
          </div>
        </button>
      )}

      {/* Night Drive Hint */}
      {isNight && !activeTrip && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
          <Moon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <p className="text-sm text-indigo-800">
            <span className="font-semibold">Driving at night?</span> Start a Safe Trip so someone knows where you are.
          </p>
        </div>
      )}

      {/* ============================================ */}
      {/* 2. QUICK CHECK-IN */}
      {/* ============================================ */}
      <button
        onClick={handleQuickCheckIn}
        disabled={processing}
        className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-left hover:border-purple-300 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Quick Check-in</h3>
            <p className="text-sm text-slate-600">One tap "I am safe" to log your status</p>
          </div>
          {processing ? <Loader2 className="w-5 h-5 text-purple-600 animate-spin" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* ============================================ */}
      {/* 3. EMERGENCY SOS */}
      {/* ============================================ */}
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
            <p className="text-sm text-red-700">Press and hold to alert contacts. Use only in danger.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400" />
        </div>
      </button>

      {/* ============================================ */}
      {/* 4. CHECKPOINT QUICK ACTION (Nigeria-specific) */}
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
            <p className="text-xs text-slate-600">Tap to log & notify your contacts</p>
          </div>
          {processing ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
        </div>
      </button>

      {/* ============================================ */}
      {/* 5. QUICK ACTIONS ROW */}
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
      {/* 6. TIPS & CHECKLIST (Collapsible) */}
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
              <p className="text-slate-600 mb-4">This will call emergency services (112) in Nigeria.</p>
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
              <p className="text-xs text-slate-500 mb-3 text-center">Or notify your trusted contacts:</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSosSms}
                  disabled={processing || trustedContacts.length === 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  📱 SMS
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

      {/* Safe Trip Modal */}
      {activeModal === 'safetrip' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Start Safe Trip</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full bg-slate-100">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Share your location with trusted contacts and set a backup timer.
            </p>

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Where are you going? (optional)</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g., Home, Office, Lagos"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expected trip duration</label>
              <div className="grid grid-cols-3 gap-2">
                {SAFE_TRIP_DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setSelectedDuration(preset.value)}
                    className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors ${
                      selectedDuration === preset.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {selectedDuration > 0 
                  ? `If you haven't ended the trip ${selectedDuration} minutes from now, your contacts are alerted 5 minutes later, even if your phone is off.`
                  : 'No timer will be set.'}
              </p>
            </div>

            {/* Contacts Summary */}
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {trustedContacts.length} trusted contact{trustedContacts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setActiveModal('contacts')}
                  className="text-xs text-blue-600 font-medium hover:text-blue-700"
                >
                  Manage
                </button>
              </div>
              {trustedContacts.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  Add contacts to notify them about your trip.
                </p>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartSafeTrip}
              disabled={processing}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              Start Safe Trip
            </button>
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
