'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useUserStats } from '@/hooks/useUserStats';
import { ReportType, Severity, ReportStatus, VerificationStatus, CheckpointType, CheckpointCheck, WaitTime, PointAction } from '@/lib/types';
import { NigerianState, STATE_CENTERS } from '@/lib/nigerianStates';
import { computeExpiry } from '@/lib/rules';
import { compressImage, validateImageFile } from '@/lib/imageCompression';
import { checkForDuplicates, checkRateLimit } from '@/lib/actions';
import { reverseGeocode } from '@/lib/geocoding';
import { Toast, ToastType } from '@/components/ui/Toast';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultState: NigerianState;
  initialLocation?: { lat: number; lng: number } | null;
}

export function CreateReportModal({ isOpen, onClose, defaultState, initialLocation }: CreateReportModalProps) {
  const { uid } = useAuthedUser();
  const { awardPoints } = useUserStats(uid);
  const [submitting, setSubmitting] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

  // Get default location from user location or selected Nigerian state
  const getDefaultLocation = () => {
    // Use user location if available
    if (initialLocation) {
      return {
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        address: '',
      };
    }
    
    // Fall back to state center
    const center = STATE_CENTERS[defaultState];
    return {
      lat: center.lat,
      lng: center.lng,
      address: '',
    };
  };

  const [formData, setFormData] = useState({
    type: ReportType.POTHOLE,
    severity: Severity.MEDIUM,
    description: '',
    location: getDefaultLocation(),
    // Checkpoint-specific fields
    checkpointType: CheckpointType.POLICE,
    checkpointChecks: [] as CheckpointCheck[],
    estimatedWaitTime: WaitTime.FIFTEEN_MIN,
    checkpointTip: '',
  });

  // Reset form data when modal opens or when initialLocation/defaultState changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: ReportType.POTHOLE,
        severity: Severity.MEDIUM,
        description: '',
        location: getDefaultLocation(),
        checkpointType: CheckpointType.POLICE,
        checkpointChecks: [],
        estimatedWaitTime: WaitTime.FIFTEEN_MIN,
        checkpointTip: '',
      });
      setUseGPS(false);
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      setUploadProgress('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialLocation, defaultState]);

  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  const handleUseGPS = async () => {
    if (!navigator.geolocation) {
      setToast({ type: 'error', message: 'GPS is not supported by your browser' });
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Get address via reverse geocoding
        setGeocoding(true);
        const address = await reverseGeocode(lat, lng);
        setGeocoding(false);
        
        setFormData({
          ...formData,
          location: {
            lat,
            lng,
            address: address || '',
          },
        });
        setUseGPS(true);
        setGpsLoading(false);
        setShowLocationConfirm(true);
      },
      (error) => {
        console.error('GPS error:', error);
        setToast({ type: 'error', message: 'Failed to get your location. Please try selecting on the map.' });
        setGpsLoading(false);
      }
    );
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    // Get address via reverse geocoding
    setGeocoding(true);
    const address = await reverseGeocode(lat, lng);
    setGeocoding(false);
    
    setFormData({
      ...formData,
      location: { lat, lng, address: address || '' },
    });
    setUseGPS(false);
    setShowLocationConfirm(true);
  };

  const handleConfirmLocation = () => {
    setShowLocationConfirm(false);
  };

  const handleAdjustLocation = () => {
    setShowLocationConfirm(false);
    // User can use the map to adjust
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setToast({ type: 'error', message: validation.error || 'Invalid file' });
        continue;
      }
      validFiles.push(file);
    }

    if (selectedPhotos.length + validFiles.length > 5) {
      setToast({ type: 'error', message: 'Maximum 5 photos allowed per report' });
      return;
    }

    setSelectedPhotos(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreviewUrls(prev => [...prev, previewUrl]);
    });
  };

  const handleRemovePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uid) {
      setToast({ type: 'error', message: 'Please wait for authentication to complete' });
      return;
    }

    if (!formData.description.trim()) {
      setToast({ message: 'Please provide a description', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      // Check rate limiting
      const rateLimitResult = await checkRateLimit(uid);
      if (!rateLimitResult.allowed) {
        setToast({ message: rateLimitResult.reason || 'Rate limit exceeded', type: 'error' });
        setSubmitting(false);
        return;
      }

      // Check for duplicates
      const duplicateCheck = await checkForDuplicates(
        uid,
        formData.type,
        formData.location.lat,
        formData.location.lng,
        100, // 100 meters
        60   // 60 minutes
      );

      if (duplicateCheck.isDuplicate) {
        const confirmSubmit = window.confirm(
          `You reported a similar ${formData.type} ${duplicateCheck.distance}m away ${duplicateCheck.minutesAgo} minutes ago. Are you sure you want to submit another report?`
        );
        
        if (!confirmSubmit) {
          setSubmitting(false);
          return;
        }
      }
      const expiresAt = computeExpiry(formData.type);
      
      const reportData: Record<string, unknown> = {
        uid,
        type: formData.type,
        severity: formData.severity,
        status: ReportStatus.ACTIVE,
        state: defaultState,
        verification: VerificationStatus.PENDING,
        location: formData.location,
        description: formData.description.trim(),
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(expiresAt),
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        flagCount: 0,
        photoUrls: [],
      };

      // Add checkpoint-specific fields if it's a checkpoint report
      if (formData.type === ReportType.CHECKPOINT) {
        reportData.checkpointType = formData.checkpointType;
        reportData.checkpointChecks = formData.checkpointChecks;
        reportData.estimatedWaitTime = formData.estimatedWaitTime;
        if (formData.checkpointTip.trim()) {
          reportData.checkpointTip = formData.checkpointTip.trim();
        }
      }

      const reportDoc = await addDoc(collection(db, 'reports'), reportData);

      // Award points for creating a report
      if (uid) {
        awardPoints(PointAction.CREATE_REPORT, reportDoc.id);
      }

      // Reset form and close immediately (optimistic UI)
      setFormData({
        type: ReportType.POTHOLE,
        severity: Severity.MEDIUM,
        description: '',
        location: getDefaultLocation(),
        checkpointType: CheckpointType.POLICE,
        checkpointChecks: [],
        estimatedWaitTime: WaitTime.FIFTEEN_MIN,
        checkpointTip: '',
      });
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      setUploadProgress('');
      setSubmitting(false);
      onClose();
      
      // Upload photos in background if any
      if (selectedPhotos.length > 0) {
        uploadPhotosInBackground(selectedPhotos, reportDoc.id, uid);
      }
    } catch (error) {
      console.error('Error creating report:', error);
      setToast({ message: 'Failed to create report. Please try again.', type: 'error' });
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  const uploadPhotosInBackground = async (photos: File[], reportId: string, userId: string) => {
    try {
      const photoUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const compressedBlob = await compressImage(photos[i], {
          maxWidth: 1600,
          targetSizeKB: 600,
        });

        const { safeToken } = await import('@/lib/safeToken');
        const uuid = safeToken();
        const storagePath = `report_photos/${userId}/${reportId}/${uuid}.jpg`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, compressedBlob, {
          contentType: 'image/jpeg',
        });

        const downloadUrl = await getDownloadURL(storageRef);
        photoUrls.push(downloadUrl);
      }

      await updateDoc(doc(db, 'reports', reportId), {
        photoUrls,
      });
    } catch (error) {
      console.error('Error uploading photos in background:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="fixed inset-0 z-[5000] flex items-start justify-center p-4 pt-8 pb-28 bg-black/50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-[5001]">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Report</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick Type Buttons */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              What are you reporting?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: ReportType.CHECKPOINT, label: 'Checkpoint', emoji: '🚔' },
                { type: ReportType.POTHOLE, label: 'Pothole', emoji: '🕳️' },
                { type: ReportType.ACCIDENT, label: 'Accident', emoji: '🚗' },
                { type: ReportType.TRAFFIC, label: 'Heavy Traffic', emoji: '🚦' },
                { type: ReportType.ROADWORK, label: 'Construction', emoji: '🚧' },
                { type: ReportType.CLOSURE, label: 'Roadblock', emoji: '⛔' },
                { type: ReportType.HAZARD, label: 'Hazard', emoji: '⚠️' },
              ].map(({ type, label, emoji }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  disabled={submitting}
                  className={`
                    p-4 rounded-2xl border-2 transition-all text-left
                    ${formData.type === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{emoji}</div>
                  <div className="text-sm font-medium text-slate-900">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(Severity).map((severity) => (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity })}
                  disabled={submitting}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all
                    ${formData.severity === severity
                      ? severity === Severity.CRITICAL ? 'bg-red-500 text-white'
                        : severity === Severity.HIGH ? 'bg-orange-500 text-white'
                        : severity === Severity.MEDIUM ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          {/* Checkpoint-Specific Fields */}
          {formData.type === ReportType.CHECKPOINT && (
            <>
              {/* Checkpoint Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Checkpoint
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: CheckpointType.POLICE, label: 'Police', emoji: '👮' },
                    { type: CheckpointType.FRSC, label: 'FRSC', emoji: '🚦' },
                    { type: CheckpointType.LASTMA, label: 'LASTMA', emoji: '🚧' },
                    { type: CheckpointType.VIO, label: 'VIO', emoji: '📋' },
                    { type: CheckpointType.ARMY, label: 'Army', emoji: '🪖' },
                    { type: CheckpointType.CUSTOMS, label: 'Customs', emoji: '🛃' },
                    { type: CheckpointType.TASK_FORCE, label: 'Task Force', emoji: '🎖️' },
                    { type: CheckpointType.OTHER, label: 'Other', emoji: '❓' },
                  ].map(({ type, label, emoji }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, checkpointType: type })}
                      disabled={submitting}
                      className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.checkpointType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* What They're Checking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are they checking? (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { check: CheckpointCheck.LICENSE, label: "Driver's License" },
                    { check: CheckpointCheck.VEHICLE_PAPERS, label: 'Vehicle Papers' },
                    { check: CheckpointCheck.INSURANCE, label: 'Insurance' },
                    { check: CheckpointCheck.ROAD_WORTHINESS, label: 'Road Worthiness' },
                    { check: CheckpointCheck.TINTED_GLASS, label: 'Tinted Glass' },
                    { check: CheckpointCheck.PARTICULARS, label: 'Particulars' },
                    { check: CheckpointCheck.RANDOM_SEARCH, label: 'Random Search' },
                    { check: CheckpointCheck.EXPIRED_TAGS, label: 'Expired Tags' },
                  ].map(({ check, label }) => {
                    const isSelected = formData.checkpointChecks.includes(check);
                    return (
                      <button
                        key={check}
                        type="button"
                        onClick={() => {
                          const newChecks = isSelected
                            ? formData.checkpointChecks.filter(c => c !== check)
                            : [...formData.checkpointChecks, check];
                          setFormData({ ...formData, checkpointChecks: newChecks });
                        }}
                        disabled={submitting}
                        className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estimated Wait Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Wait Time
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { time: WaitTime.FIVE_MIN, label: '~5 min' },
                    { time: WaitTime.FIFTEEN_MIN, label: '~15 min' },
                    { time: WaitTime.THIRTY_MIN, label: '~30 min' },
                    { time: WaitTime.ONE_HOUR, label: '1hr+' },
                  ].map(({ time, label }) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setFormData({ ...formData, estimatedWaitTime: time })}
                      disabled={submitting}
                      className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.estimatedWaitTime === time
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip for other drivers (Optional)
                </label>
                <input
                  type="text"
                  value={formData.checkpointTip}
                  onChange={(e) => setFormData({ ...formData, checkpointTip: e.target.value })}
                  placeholder="e.g., 'Have documents ready' or 'They're lenient today'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                  maxLength={100}
                />
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={formData.type === ReportType.CHECKPOINT ? "Any additional details about this checkpoint..." : "Describe the issue in detail..."}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={submitting}
              required
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (Optional - Max 5)
            </label>
            
            {photoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      disabled={submitting}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP (Max 10MB each)
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handlePhotoSelect}
                disabled={submitting || selectedPhotos.length >= 5}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Photos will be compressed to ≤600KB and resized to max 1600px width
            </p>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <button
                type="button"
                onClick={handleUseGPS}
                disabled={submitting || gpsLoading}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {gpsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                Use My GPS
              </button>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              {useGPS ? (
                <div className="flex items-center gap-2 text-green-600">
                  <MapPin className="w-4 h-4" />
                  <span>Using your current location</span>
                </div>
              ) : (
                <span>Click on the map to set location</span>
              )}
            </div>

            <LocationPicker
              location={formData.location}
              onLocationSelect={handleLocationSelect}
            />

            {formData.location.address && (
              <div className="mt-2 p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{formData.location.address}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!formData.location.address && (
              <p className="text-xs text-slate-500 mt-2">
                Coordinates: {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
              </p>
            )}
            
            {geocoding && (
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Getting address...
              </p>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-sm text-blue-700">{uploadProgress}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadProgress ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                'Create Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
