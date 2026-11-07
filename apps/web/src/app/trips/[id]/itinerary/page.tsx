'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Columns,
  Compass,
  Edit2,
  FileText,
  Info,
  Lightbulb,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  MessageSquarePlus,
  MoveDown,
  MoveUp,
  Navigation,
  Plus,
  Search,
  Sparkles,
  ThumbsUp,
  Trash2,
  Users,
  Vote,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import {
  Activity,
  ActivitySuggestion,
  ActivitySuggestionStatus,
  AiActivityProposal,
  AiConciergeResponse,
  AiTripTheme,
  CreateActivityInput,
  CreateActivitySuggestionInput,
  CreateItineraryDayInput,
  GenerateAiSuggestionsInput,
  ImportAiProposalsInput,
  ImportAiProposalsResult,
  ItineraryDay,
  ReorderActivitiesInput,
  Trip,
  UpdateActivityInput,
  UpdateItineraryDayInput,
} from '@tripnest/shared';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import {
  ConciergePreferences,
  ConciergePreferencesDrawer,
  ConciergeReviewWorkbench,
  DEFAULT_PREFERENCES,
} from '../../../../components/concierge';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { DynamicItineraryMap, getDayColor } from '../../../../components/map';
import { useAuth } from '../../../../context/AuthContext';
import { apiClient } from '../../../../lib/api-client';
import { searchCoordinates } from '../../../../lib/geocoding';
import {
  calculateDurationDays,
  formatCurrency,
  formatDateRange,
  formatDuration,
  formatTime,
  getStatusBadge,
} from '../../../../lib/trip-utils';

function getTimePeriodInfo(timeStr?: string | null): {
  label: string;
  badgeClass: string;
} {
  if (!timeStr) {
    return {
      label: 'Flexible',
      badgeClass: 'bg-background text-secondary-text border-border',
    };
  }
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) {
    return {
      label: 'Flexible',
      badgeClass: 'bg-background text-secondary-text border-border',
    };
  }
  if (hour >= 5 && hour < 12) {
    return {
      label: 'Morning',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      label: 'Afternoon',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
    };
  }
  return {
    label: 'Evening',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  };
}

function ItineraryPlannerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = params.id as string;
  const initialDayParam = searchParams.get('day');
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab View: Timeline vs Activity Suggestions vs AI Concierge
  const [activeViewTab, setActiveViewTab] = useState<
    'TIMELINE' | 'SUGGESTIONS' | 'CONCIERGE'
  >('TIMELINE');

  // AI Travel Concierge State (Milestone 7, Stage 4C)
  const [isConciergeDrawerOpen, setIsConciergeDrawerOpen] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isImportingProposals, setIsImportingProposals] = useState(false);
  const [conciergeResponse, setConciergeResponse] =
    useState<AiConciergeResponse | null>(null);
  const [proposalsDraft, setProposalsDraft] = useState<AiActivityProposal[]>([]);
  const [conciergePreferences, setConciergePreferences] =
    useState<ConciergePreferences>(DEFAULT_PREFERENCES);
  const [conciergeError, setConciergeError] = useState<string | null>(null);

  // Desktop Itinerary Viewing Mode (Milestone 7): List View vs Split View vs Map View
  const [itineraryLayoutMode, setItineraryLayoutMode] = useState<'LIST' | 'SPLIT' | 'MAP'>(
    'SPLIT',
  );
  // Mobile Itinerary Viewing Toggle: List vs Map
  const [mobileViewMode, setMobileViewMode] = useState<'LIST' | 'MAP'>('LIST');

  // Timeline and Map Interactive Synchronization
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [sugFilterDayId, setSugFilterDayId] = useState<string>('ALL');
  const [sugFilterStatus, setSugFilterStatus] = useState<string>('ALL');
  const [isAddSuggestionOpen, setIsAddSuggestionOpen] = useState(false);

  // Suggestion Form State
  const [sugDayId, setSugDayId] = useState('');
  const [sugTitle, setSugTitle] = useState('');
  const [sugDescription, setSugDescription] = useState('');
  const [sugLocation, setSugLocation] = useState('');
  const [sugLatitude, setSugLatitude] = useState('');
  const [sugLongitude, setSugLongitude] = useState('');
  const [sugCoordError, setSugCoordError] = useState<string | null>(null);
  const [isGeocodingSuggestion, setIsGeocodingSuggestion] = useState(false);
  const [sugStartTime, setSugStartTime] = useState('10:00');
  const [sugDuration, setSugDuration] = useState('60');
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Modals for Activities and Days
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);

  const [isEditDayOpen, setIsEditDayOpen] = useState(false);
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [isDeleteDayOpen, setIsDeleteDayOpen] = useState(false);

  // Activity Form State (with optional coordinates)
  const [actTitle, setActTitle] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actLocation, setActLocation] = useState('');
  const [actLatitude, setActLatitude] = useState('');
  const [actLongitude, setActLongitude] = useState('');
  const [actCoordError, setActCoordError] = useState<string | null>(null);
  const [isGeocodingActivity, setIsGeocodingActivity] = useState(false);
  const [isGeocodingUnmapped, setIsGeocodingUnmapped] = useState(false);
  const [actStartTime, setActStartTime] = useState('');
  const [actDuration, setActDuration] = useState('');
  const [actNotes, setActNotes] = useState('');
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  // Day Form State
  const [dayTitle, setDayTitle] = useState('');
  const [dayNotes, setDayNotes] = useState('');
  const [isSavingDay, setIsSavingDay] = useState(false);

  // Add Day Form State
  const [newDayNumber, setNewDayNumber] = useState<number>(1);
  const [newDayDate, setNewDayDate] = useState<string>('');
  const [newDayTitle, setNewDayTitle] = useState<string>('');
  const [newDayNotes, setNewDayNotes] = useState<string>('');

  const isOwner = trip
    ? trip.isOwner !== false &&
      (trip.userId === user?.id || trip.currentUserRole === 'OWNER')
    : false;

  // Load trip, itinerary, and companion suggestions
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [tripRes, itRes, sugRes] = await Promise.all([
        apiClient<Trip>(`/trips/${tripId}`),
        apiClient<ItineraryDay[]>(`/trips/${tripId}/itinerary`),
        apiClient<ActivitySuggestion[]>(`/trips/${tripId}/suggestions`),
      ]);

      if (tripRes.data) {
        setTrip(tripRes.data);
      }

      if (itRes.data) {
        setItineraryDays(itRes.data);

        // Determine active day
        if (initialDayParam) {
          const match = itRes.data.find(
            (d) => d.dayNumber === parseInt(initialDayParam, 10),
          );
          if (match) {
            setActiveDayId(match.id);
          } else if (itRes.data.length > 0) {
            setActiveDayId(itRes.data[0].id);
          }
        } else if (itRes.data.length > 0) {
          setActiveDayId(itRes.data[0].id);
        }
      }

      if (sugRes.data) {
        setSuggestions(sugRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load itinerary data:', err);
      setError(err.message || 'Failed to load itinerary.');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, initialDayParam]);

  useEffect(() => {
    if (tripId) {
      loadData();
    }
  }, [tripId, loadData]);

  // Active Day object
  const activeDay = useMemo(() => {
    return itineraryDays.find((d) => d.id === activeDayId) || itineraryDays[0] || null;
  }, [itineraryDays, activeDayId]);

  // Total and completed activity stats across the trip
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;

    for (const day of itineraryDays) {
      const activities = day.activities || [];
      total += activities.length;
      completed += activities.filter((a) => a.isCompleted).length;
    }

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [itineraryDays]);

  // Suggestions pending for the currently active day
  const activeDayPendingSuggestions = useMemo(() => {
    if (!activeDay) return [];
    return suggestions.filter(
      (s) => s.itineraryDayId === activeDay.id && s.status === 'PENDING',
    );
  }, [suggestions, activeDay]);

  // Filtered suggestions for the Suggestions view
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const matchesDay = sugFilterDayId === 'ALL' || s.itineraryDayId === sugFilterDayId;
      const matchesStatus = sugFilterStatus === 'ALL' || s.status === sugFilterStatus;
      return matchesDay && matchesStatus;
    });
  }, [suggestions, sugFilterDayId, sugFilterStatus]);

  // Destination Coordinates helper
  const tripDestinationCoords = useMemo<[number, number] | null>(() => {
    if (
      trip?.destination &&
      typeof trip.destination.latitude === 'number' &&
      typeof trip.destination.longitude === 'number' &&
      !isNaN(trip.destination.latitude) &&
      !isNaN(trip.destination.longitude)
    ) {
      return [trip.destination.latitude, trip.destination.longitude];
    }
    return null;
  }, [trip?.destination]);

  // Synchronized Selection Callback between Timeline and Map
  const handleSelectActivityOnMap = useCallback(
    (activityId: string) => {
      setSelectedActivityId(activityId);
      for (const day of itineraryDays) {
        const found = (day.activities || []).some((a) => a.id === activityId);
        if (found) {
          setActiveDayId(day.id);
          break;
        }
      }
      setTimeout(() => {
        const el = document.getElementById(`activity-${activityId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    },
    [itineraryDays],
  );

  // =========================================================================
  // ACTIVITY ACTIONS
  // =========================================================================

  const handleOpenAddActivity = () => {
    setActTitle('');
    setActDescription('');
    setActLocation('');
    setActLatitude('');
    setActLongitude('');
    setActCoordError(null);
    setActStartTime('09:30');
    setActDuration('60');
    setActNotes('');
    setIsAddActivityOpen(true);
  };

  const handleGeocodeActivityLocation = async () => {
    if (!actLocation.trim()) {
      setActCoordError('Please type a location name first to search coordinates.');
      return;
    }
    try {
      setIsGeocodingActivity(true);
      setActCoordError(null);
      const hint = trip?.destination
        ? `${trip.destination.city}, ${trip.destination.country}`
        : undefined;
      const results = await searchCoordinates(actLocation, hint);
      if (results.length > 0) {
        setActLatitude(String(results[0].latitude));
        setActLongitude(String(results[0].longitude));
        showToast('Coordinates located on map.');
      } else {
        setActCoordError(
          'No exact coordinates found. You can enter latitude and longitude manually.',
        );
      }
    } catch {
      setActCoordError('Geocoding search failed. You can enter coordinates manually.');
    } finally {
      setIsGeocodingActivity(false);
    }
  };

  const handleUseDestinationCoordsForActivity = () => {
    if (tripDestinationCoords) {
      setActLatitude(String(tripDestinationCoords[0]));
      setActLongitude(String(tripDestinationCoords[1]));
      setActCoordError(null);
      showToast(`Filled destination coordinates for ${trip?.destination?.name || 'trip'}.`);
    }
  };

  const handleGeocodeUnmappedActivities = async () => {
    try {
      setIsGeocodingUnmapped(true);
      const res = await apiClient<{
        resolvedCount: number;
        unmappedCount: number;
        message: string;
      }>(`/trips/${tripId}/itinerary/geocode-activities`, {
        method: 'POST',
      });
      if (res.data) {
        if (res.data.resolvedCount > 0) {
          showToast(`Located ${res.data.resolvedCount} stop(s) on the journey map!`);
          await loadData();
        } else {
          showToast(res.data.message || 'All stops are already located on map.');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to locate stops on map.');
    } finally {
      setIsGeocodingUnmapped(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDay) return;

    if (!actTitle.trim()) {
      showToast('Activity title is required.');
      return;
    }

    setActCoordError(null);
    let parsedLat: number | undefined = undefined;
    let parsedLng: number | undefined = undefined;

    const latStr = actLatitude.trim();
    const lngStr = actLongitude.trim();

    if (latStr || lngStr) {
      if (!latStr || !lngStr) {
        setActCoordError(
          'Both latitude and longitude are required together to plot coordinates.',
        );
        return;
      }
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setActCoordError('Latitude must be a valid number between -90 and 90.');
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        setActCoordError('Longitude must be a valid number between -180 and 180.');
        return;
      }
      parsedLat = Number(lat.toFixed(6));
      parsedLng = Number(lng.toFixed(6));
    }

    try {
      setIsSavingActivity(true);

      const parsedDuration = actDuration.trim() ? parseInt(actDuration, 10) : undefined;

      const payload: CreateActivityInput = {
        itineraryDayId: activeDay.id,
        title: actTitle.trim(),
        description: actDescription.trim() || undefined,
        location: actLocation.trim() || undefined,
        latitude: parsedLat,
        longitude: parsedLng,
        startTime: actStartTime.trim() || undefined,
        durationMinutes: parsedDuration,
        notes: actNotes.trim() || undefined,
      };

      const res = await apiClient<Activity>(`/trips/${tripId}/activities`, {
        method: 'POST',
        body: payload,
      });

      if (res.data) {
        setItineraryDays((prevDays) =>
          prevDays.map((day) => {
            if (day.id === activeDay.id) {
              return {
                ...day,
                activities: [...(day.activities || []), res.data as Activity],
              };
            }
            return day;
          }),
        );
        showToast('Activity added to day schedule.');
        setIsAddActivityOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to add activity:', err);
      showToast(err.message || 'Failed to add activity.');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleOpenEditActivity = (activity: Activity) => {
    setActivityToEdit(activity);
    setActTitle(activity.title);
    setActDescription(activity.description || '');
    setActLocation(activity.location || '');
    setActLatitude(
      activity.latitude !== undefined && activity.latitude !== null
        ? String(activity.latitude)
        : '',
    );
    setActLongitude(
      activity.longitude !== undefined && activity.longitude !== null
        ? String(activity.longitude)
        : '',
    );
    setActCoordError(null);
    setActStartTime(activity.startTime || '');
    setActDuration(activity.durationMinutes ? String(activity.durationMinutes) : '');
    setActNotes(activity.notes || '');
    setIsEditActivityOpen(true);
  };

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDay || !activityToEdit) return;

    setActCoordError(null);
    let parsedLat: number | undefined = undefined;
    let parsedLng: number | undefined = undefined;

    const latStr = actLatitude.trim();
    const lngStr = actLongitude.trim();

    if (latStr || lngStr) {
      if (!latStr || !lngStr) {
        setActCoordError(
          'Both latitude and longitude are required together to plot coordinates.',
        );
        return;
      }
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setActCoordError('Latitude must be a valid number between -90 and 90.');
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        setActCoordError('Longitude must be a valid number between -180 and 180.');
        return;
      }
      parsedLat = Number(lat.toFixed(6));
      parsedLng = Number(lng.toFixed(6));
    }

    try {
      setIsSavingActivity(true);
      const parsedDuration = actDuration.trim() ? parseInt(actDuration, 10) : undefined;

      const payload: UpdateActivityInput = {
        title: actTitle.trim(),
        description: actDescription.trim() || undefined,
        location: actLocation.trim() || undefined,
        latitude: parsedLat,
        longitude: parsedLng,
        startTime: actStartTime.trim() || undefined,
        durationMinutes: parsedDuration,
        notes: actNotes.trim() || undefined,
      };

      const res = await apiClient<Activity>(
        `/trips/${tripId}/activities/${activityToEdit.id}`,
        {
          method: 'PATCH',
          body: payload,
        },
      );

      if (res.data) {
        setItineraryDays((prevDays) =>
          prevDays.map((day) => {
            if (day.id === activeDay.id) {
              return {
                ...day,
                activities: (day.activities || []).map((a) =>
                  a.id === activityToEdit.id ? (res.data as Activity) : a,
                ),
              };
            }
            return day;
          }),
        );
        showToast('Activity updated.');
        setIsEditActivityOpen(false);
        setActivityToEdit(null);
      }
    } catch (err: any) {
      console.error('Failed to update activity:', err);
      showToast(err.message || 'Failed to update activity.');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!activeDay) return;

    try {
      await apiClient(`/trips/${tripId}/activities/${activityId}`, {
        method: 'DELETE',
      });

      setItineraryDays((prevDays) =>
        prevDays.map((day) => {
          if (day.id === activeDay.id) {
            return {
              ...day,
              activities: (day.activities || []).filter((a) => a.id !== activityId),
            };
          }
          return day;
        }),
      );
      showToast('Activity removed.');
    } catch (err: any) {
      console.error('Failed to delete activity:', err);
      showToast(err.message || 'Failed to delete activity.');
    }
  };

  const handleToggleComplete = async (activity: Activity) => {
    if (!activeDay) return;

    try {
      const res = await apiClient<Activity>(
        `/trips/${tripId}/activities/${activity.id}/complete`,
        {
          method: 'PATCH',
        },
      );

      if (res.data) {
        setItineraryDays((prevDays) =>
          prevDays.map((day) => {
            if (day.id === activeDay.id) {
              return {
                ...day,
                activities: (day.activities || []).map((a) =>
                  a.id === activity.id ? { ...a, isCompleted: res.data!.isCompleted } : a,
                ),
              };
            }
            return day;
          }),
        );
      }
    } catch (err: any) {
      console.error('Failed to toggle completion:', err);
      showToast(err.message || 'Failed to toggle status.');
    }
  };

  const handleMoveActivity = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!activeDay) return;
    const activities = [...(activeDay.activities || [])];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= activities.length) return;

    // Swap items locally
    const temp = activities[index];
    activities[index] = activities[targetIndex];
    activities[targetIndex] = temp;

    const newIds = activities.map((a) => a.id);

    try {
      const res = await apiClient<Activity[]>(`/trips/${tripId}/activities/reorder`, {
        method: 'PATCH',
        body: {
          itineraryDayId: activeDay.id,
          activityIds: newIds,
        },
      });

      if (res.data) {
        setItineraryDays((prevDays) =>
          prevDays.map((day) => {
            if (day.id === activeDay.id) {
              return {
                ...day,
                activities: res.data as Activity[],
              };
            }
            return day;
          }),
        );
      }
    } catch (err: any) {
      console.error('Failed to reorder activities:', err);
      showToast(err.message || 'Failed to reorder activities.');
    }
  };

  // =========================================================================
  // ITINERARY DAY ACTIONS (OWNER ONLY)
  // =========================================================================

  const handleOpenEditDay = () => {
    if (!activeDay) return;
    setDayTitle(activeDay.title || '');
    setDayNotes(activeDay.notes || '');
    setIsEditDayOpen(true);
  };

  const handleUpdateDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDay) return;

    try {
      setIsSavingDay(true);
      const res = await apiClient<ItineraryDay>(
        `/trips/${tripId}/itinerary/days/${activeDay.id}`,
        {
          method: 'PATCH',
          body: {
            title: dayTitle.trim() || undefined,
            notes: dayNotes.trim() || undefined,
          },
        },
      );

      if (res.data) {
        setItineraryDays((prev) =>
          prev.map((d) => (d.id === activeDay.id ? { ...d, ...res.data! } : d)),
        );
        showToast('Day notes updated.');
        setIsEditDayOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to update day:', err);
      showToast(err.message || 'Failed to update day.');
    } finally {
      setIsSavingDay(false);
    }
  };

  const handleOpenAddDay = () => {
    const nextNumber = itineraryDays.length + 1;
    setNewDayNumber(nextNumber);
    setNewDayTitle(`Day ${nextNumber}`);
    setNewDayNotes('');

    // Estimate next day date
    if (itineraryDays.length > 0) {
      const lastDay = itineraryDays[itineraryDays.length - 1];
      const nextDate = new Date(new Date(lastDay.date).getTime() + 24 * 60 * 60 * 1000);
      setNewDayDate(nextDate.toISOString().split('T')[0]);
    } else if (trip) {
      setNewDayDate(trip.startDate.split('T')[0]);
    }

    setIsAddDayOpen(true);
  };

  const handleCreateDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayDate) {
      showToast('Date is required.');
      return;
    }

    try {
      setIsSavingDay(true);
      const res = await apiClient<ItineraryDay>(`/trips/${tripId}/itinerary/days`, {
        method: 'POST',
        body: {
          dayNumber: newDayNumber,
          date: newDayDate,
          title: newDayTitle.trim() || undefined,
          notes: newDayNotes.trim() || undefined,
        },
      });

      if (res.data) {
        setItineraryDays((prev) => [...prev, { ...res.data!, activities: [] }]);
        setActiveDayId(res.data.id);
        showToast(`Day ${res.data.dayNumber} added.`);
        setIsAddDayOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to add day:', err);
      showToast(err.message || 'Failed to add day.');
    } finally {
      setIsSavingDay(false);
    }
  };

  const handleDeleteDay = async () => {
    if (!activeDay) return;

    try {
      setIsSavingDay(true);
      await apiClient(`/trips/${tripId}/itinerary/days/${activeDay.id}`, {
        method: 'DELETE',
      });

      const remaining = itineraryDays.filter((d) => d.id !== activeDay.id);
      setItineraryDays(remaining);
      if (remaining.length > 0) {
        setActiveDayId(remaining[0].id);
      }
      showToast(`Day ${activeDay.dayNumber} removed.`);
      setIsDeleteDayOpen(false);
    } catch (err: any) {
      console.error('Failed to delete day:', err);
      showToast(err.message || 'Failed to delete day.');
    } finally {
      setIsSavingDay(false);
    }
  };

  // =========================================================================
  // ACTIVITY SUGGESTIONS & VOTING ACTIONS (MILESTONE 6)
  // =========================================================================

  const handleOpenAddSuggestion = () => {
    setSugDayId(activeDay?.id || (itineraryDays[0]?.id ?? ''));
    setSugTitle('');
    setSugDescription('');
    setSugLocation('');
    setSugLatitude('');
    setSugLongitude('');
    setSugCoordError(null);
    setSugStartTime('10:00');
    setSugDuration('60');
    setSuggestionError(null);
    setIsAddSuggestionOpen(true);
  };

  const handleGeocodeSuggestionLocation = async () => {
    if (!sugLocation.trim()) {
      setSugCoordError('Please type a location name first to search coordinates.');
      return;
    }
    try {
      setIsGeocodingSuggestion(true);
      setSugCoordError(null);
      const hint = trip?.destination
        ? `${trip.destination.city}, ${trip.destination.country}`
        : undefined;
      const results = await searchCoordinates(sugLocation, hint);
      if (results.length > 0) {
        setSugLatitude(String(results[0].latitude));
        setSugLongitude(String(results[0].longitude));
        showToast('Coordinates located for suggestion.');
      } else {
        setSugCoordError(
          'No exact coordinates found. You can enter latitude and longitude manually.',
        );
      }
    } catch {
      setSugCoordError('Geocoding search failed. You can enter coordinates manually.');
    } finally {
      setIsGeocodingSuggestion(false);
    }
  };

  const handleUseDestinationCoordsForSuggestion = () => {
    if (tripDestinationCoords) {
      setSugLatitude(String(tripDestinationCoords[0]));
      setSugLongitude(String(tripDestinationCoords[1]));
      setSugCoordError(null);
      showToast(`Filled destination coordinates for suggestion.`);
    }
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestionError(null);
    setSugCoordError(null);

    if (!sugTitle.trim()) {
      setSuggestionError('Suggestion title is required.');
      return;
    }
    if (!sugDayId) {
      setSuggestionError('Please select an itinerary day.');
      return;
    }

    let parsedLat: number | undefined = undefined;
    let parsedLng: number | undefined = undefined;

    const latStr = sugLatitude.trim();
    const lngStr = sugLongitude.trim();

    if (latStr || lngStr) {
      if (!latStr || !lngStr) {
        setSugCoordError(
          'Both latitude and longitude are required together to plot coordinates.',
        );
        return;
      }
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setSugCoordError('Latitude must be a valid number between -90 and 90.');
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        setSugCoordError('Longitude must be a valid number between -180 and 180.');
        return;
      }
      parsedLat = Number(lat.toFixed(6));
      parsedLng = Number(lng.toFixed(6));
    }

    try {
      setIsSavingSuggestion(true);
      const res = await apiClient<ActivitySuggestion>(`/trips/${tripId}/suggestions`, {
        method: 'POST',
        body: {
          itineraryDayId: sugDayId,
          title: sugTitle.trim(),
          description: sugDescription.trim() || undefined,
          location: sugLocation.trim() || undefined,
          latitude: parsedLat,
          longitude: parsedLng,
          startTime: sugStartTime.trim() || undefined,
          durationMinutes: sugDuration ? parseInt(sugDuration, 10) : undefined,
        },
      });

      if (res.data) {
        setSuggestions((prev) => [res.data as ActivitySuggestion, ...prev]);
        showToast('Activity suggested for companion voting!');
        setIsAddSuggestionOpen(false);
        setActiveViewTab('SUGGESTIONS');
      }
    } catch (err: any) {
      setSuggestionError(err.message || 'Failed to submit suggestion.');
    } finally {
      setIsSavingSuggestion(false);
    }
  };

  const handleToggleVote = async (sug: ActivitySuggestion) => {
    try {
      if (sug.hasVoted) {
        const res = await apiClient<ActivitySuggestion>(
          `/trips/${tripId}/suggestions/${sug.id}/vote`,
          { method: 'DELETE' },
        );
        if (res.data) {
          setSuggestions((prev) => prev.map((s) => (s.id === sug.id ? res.data! : s)));
          showToast('Vote removed.');
        }
      } else {
        const res = await apiClient<ActivitySuggestion>(
          `/trips/${tripId}/suggestions/${sug.id}/vote`,
          { method: 'POST' },
        );
        if (res.data) {
          setSuggestions((prev) => prev.map((s) => (s.id === sug.id ? res.data! : s)));
          showToast('Vote cast!');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update vote.');
    }
  };

  const handleApproveSuggestion = async (sugId: string) => {
    try {
      const res = await apiClient<ActivitySuggestion>(
        `/trips/${tripId}/suggestions/${sugId}/status`,
        {
          method: 'PATCH',
          body: { status: 'APPROVED' },
        },
      );

      if (res.data) {
        setSuggestions((prev) => prev.map((s) => (s.id === sugId ? res.data! : s)));
        showToast('Suggestion approved and added to confirmed itinerary!');

        // Refresh itinerary to include the new confirmed activity
        const itRes = await apiClient<ItineraryDay[]>(`/trips/${tripId}/itinerary`);
        if (itRes.data) setItineraryDays(itRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to approve suggestion.');
    }
  };

  const handleRejectSuggestion = async (sugId: string) => {
    try {
      const res = await apiClient<ActivitySuggestion>(
        `/trips/${tripId}/suggestions/${sugId}/status`,
        {
          method: 'PATCH',
          body: { status: 'REJECTED' },
        },
      );

      if (res.data) {
        setSuggestions((prev) => prev.map((s) => (s.id === sugId ? res.data! : s)));
        showToast('Suggestion marked as rejected.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reject suggestion.');
    }
  };

  // =========================================================================
  // AI TRAVEL CONCIERGE ACTIONS (MILESTONE 7, STAGE 4C)
  // =========================================================================

  const handleOpenConcierge = () => {
    if (proposalsDraft.length > 0) {
      setActiveViewTab('CONCIERGE');
    } else {
      setIsConciergeDrawerOpen(true);
    }
  };

  const handleGenerateSuggestions = async (preferences: ConciergePreferences) => {
    try {
      setIsGeneratingSuggestions(true);
      setConciergeError(null);

      const themesToSend: AiTripTheme[] =
        preferences.themes.length > 0
          ? preferences.themes
          : ['CULTURE', 'FOOD'];
      const promptParts: string[] = [];
      if (preferences.interests.length > 0) {
        promptParts.push(`Interests: ${preferences.interests.join(', ')}`);
      }
      if (preferences.customNotes.trim()) {
        promptParts.push(`Notes: ${preferences.customNotes.trim()}`);
      }
      const freeTextPrompt = promptParts.join('. ').slice(0, 300);

      const payload: GenerateAiSuggestionsInput = {
        pace: preferences.pace,
        themes: themesToSend,
        freeTextPrompt: freeTextPrompt || undefined,
      };

      const res = await apiClient<AiConciergeResponse>(
        `/trips/${tripId}/ai/suggestions`,
        {
          method: 'POST',
          body: payload,
        },
      );

      if (res.data) {
        setConciergeResponse(res.data);
        const list = res.data.suggestions || res.data.proposals || [];
        setProposalsDraft(list);
        setConciergePreferences(preferences);
        setIsConciergeDrawerOpen(false);
        setActiveViewTab('CONCIERGE');
        showToast(
          `Concierge generated ${list.length} activity proposal${list.length === 1 ? '' : 's'}!`,
        );
      }
    } catch (err: any) {
      console.error('Failed to generate concierge suggestions:', err);
      setConciergeError(
        err.message || 'Failed to generate recommendations. Please try again.',
      );
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleImportProposals = async (selectedProposals: AiActivityProposal[]) => {
    if (selectedProposals.length === 0 || isImportingProposals) return;

    try {
      setIsImportingProposals(true);

      const payload: ImportAiProposalsInput = {
        proposals: selectedProposals.map((p) => ({
          itineraryDayId: p.itineraryDayId,
          title: p.title,
          description: p.description,
          location: p.location,
          latitude: p.latitude,
          longitude: p.longitude,
          startTime: p.startTime,
          durationMinutes: p.durationMinutes,
          notes: p.notes,
        })),
      };

      const res = await apiClient<ImportAiProposalsResult>(
        `/trips/${tripId}/ai/import`,
        {
          method: 'POST',
          body: payload,
        },
      );

      if (res.data) {
        const { importedCount, skippedCount } = res.data;
        const skippedText =
          skippedCount > 0 ? ` (${skippedCount} duplicate(s) skipped)` : '';
        showToast(
          `Successfully imported ${importedCount} activity${
            importedCount === 1 ? '' : 'ies'
          } to confirmed itinerary${skippedText}!`,
        );

        // Remove imported proposals from the review draft
        const importedKeys = new Set(
          selectedProposals.map(
            (p) => `${p.itineraryDayId}:${p.title.trim().toLowerCase()}`,
          ),
        );
        setProposalsDraft((prev) =>
          prev.filter(
            (p) =>
              !importedKeys.has(
                `${p.itineraryDayId}:${p.title.trim().toLowerCase()}`,
              ),
          ),
        );

        // Reload data to reflect imported activities across timeline and map
        await loadData();

        // Switch to Confirmed Itinerary Timeline view
        setActiveViewTab('TIMELINE');
      }
    } catch (err: any) {
      console.error('Failed to import AI proposals:', err);
      showToast(err.message || 'Failed to import activities to itinerary.');
    } finally {
      setIsImportingProposals(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-secondary-text">
          Loading itinerary timeline and canvas...
        </p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <Info className="w-6 h-6" />
        </div>
        <h2 className="font-semibold text-2xl text-primary-text">
          Itinerary Unavailable
        </h2>
        <p className="text-xs sm:text-sm text-secondary-text">
          {error || 'The itinerary could not be loaded.'}
        </p>
        <div className="pt-2">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to My Trips</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-50 bg-primary-text text-surface text-xs font-medium px-4 py-3 rounded-lg shadow-lifted border border-border animate-in fade-in-50 duration-150 flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Overview Link */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/trips/${trip.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-text hover:text-primary-text transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-accent" />
              <span>Back to Trip Overview</span>
            </Link>
            <span className="text-secondary-text/40">/</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Day-by-Day Timeline
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-semibold text-2xl sm:text-3.5xl text-primary-text tracking-tight">
              {trip.title}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-bg text-accent font-semibold border border-accent/20">
              {trip.destination?.city
                ? `${trip.destination.city}, ${trip.destination.country || ''}`
                : trip.destination?.name || 'Voyage'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-secondary-text mt-2 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </span>
            <span>•</span>
            <span>
              {itineraryDays.length} {itineraryDays.length === 1 ? 'Day' : 'Days'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-accent" />
              <span>
                {trip.travelerCount} {trip.travelerCount === 1 ? 'Traveler' : 'Travelers'}
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold text-primary-text">
              <Wallet className="w-3.5 h-3.5 text-accent" />
              <span>{formatCurrency(trip.budgetAmount, trip.currency || 'INR')}</span>
            </span>
          </div>
        </div>

        {/* Action Controls & Overview Button */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 pt-1">
          <Link
            href={`/trips/${trip.id}`}
            className="px-3.5 py-2 rounded-xl bg-surface border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors shadow-xs"
          >
            Trip Overview
          </Link>
          <Link
            href="/expenses"
            className="px-3.5 py-2 rounded-xl bg-surface border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5 text-accent" />
            <span>Expenses</span>
          </Link>
          <button
            type="button"
            onClick={handleOpenAddSuggestion}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-accent/40 text-accent text-xs font-semibold hover:bg-accent-bg transition-colors shadow-xs"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Suggest Activity</span>
          </button>
          <button
            type="button"
            onClick={handleOpenConcierge}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-accent text-accent text-xs font-semibold hover:bg-accent-bg transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Concierge</span>
            {proposalsDraft.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-accent text-surface font-semibold">
                {proposalsDraft.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleOpenAddActivity}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* View Mode Tabs: Timeline Schedule vs Companion Suggestions vs AI Concierge */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveViewTab('TIMELINE')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeViewTab === 'TIMELINE'
              ? 'border-accent text-accent'
              : 'border-transparent text-secondary-text hover:text-primary-text'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Confirmed Itinerary ({stats.total})</span>
        </button>

        <button
          onClick={() => setActiveViewTab('SUGGESTIONS')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeViewTab === 'SUGGESTIONS'
              ? 'border-accent text-accent'
              : 'border-transparent text-secondary-text hover:text-primary-text'
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Activity Suggestions &amp; Voting ({suggestions.length})</span>
        </button>

        <button
          onClick={handleOpenConcierge}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeViewTab === 'CONCIERGE'
              ? 'border-accent text-accent'
              : 'border-transparent text-secondary-text hover:text-primary-text'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Concierge</span>
          {proposalsDraft.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-accent-bg text-accent font-semibold">
              {proposalsDraft.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: CONFIRMED ITINERARY TIMELINE (LIST / SPLIT / MAP VIEWS)
          ========================================================================= */}
      {activeViewTab === 'TIMELINE' && (
        <div className="space-y-6">
          {/* Trip Overview Metric Strip */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Metric 1: Trip Budget in INR */}
            <div className="flex items-center gap-3.5 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-xl bg-accent-bg text-accent flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-secondary-text uppercase tracking-wider block">
                  Trip Budget (INR)
                </span>
                <span className="font-semibold text-base sm:text-lg text-primary-text tracking-tight truncate block">
                  {formatCurrency(trip.budgetAmount, trip.currency || 'INR')}
                </span>
              </div>
            </div>

            {/* Metric 2: Total Stops */}
            <div className="flex items-center gap-3.5 pt-2 sm:pt-0 sm:pl-6">
              <div className="w-10 h-10 rounded-xl bg-accent-bg text-accent flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-secondary-text uppercase tracking-wider block">
                  Scheduled Stops
                </span>
                <span className="font-semibold text-base sm:text-lg text-primary-text tracking-tight block">
                  {stats.total} {stats.total === 1 ? 'Stop' : 'Stops'}
                </span>
              </div>
            </div>

            {/* Metric 3: Completed Stops */}
            <div className="flex items-center gap-3.5 pt-2 sm:pt-0 sm:pl-6">
              <div className="w-10 h-10 rounded-xl bg-accent-bg text-accent flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-secondary-text uppercase tracking-wider block">
                  Completed
                </span>
                <span className="font-semibold text-base sm:text-lg text-primary-text tracking-tight block">
                  {stats.completed} of {stats.total} stops
                </span>
              </div>
            </div>

            {/* Metric 4: Itinerary Progress */}
            <div className="flex flex-col justify-center gap-1.5 pt-2 sm:pt-0 sm:pl-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-secondary-text uppercase tracking-wider">
                  Progress
                </span>
                <span className="font-semibold text-accent">{stats.pct}%</span>
              </div>
              <div className="w-full h-2 bg-background rounded-full overflow-hidden border border-border/60">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* View Modes Selector Strip (Milestone 7, Stage 3) */}
          <div className="bg-surface border border-border rounded-xl p-3 shadow-subtle flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Compass className="w-4 h-4 text-accent shrink-0" />
              <span className="font-semibold text-primary-text hidden sm:inline">
                Itinerary View:
              </span>
              <span className="text-secondary-text text-xs">
                {itineraryLayoutMode === 'SPLIT'
                  ? 'Split Itinerary & Map'
                  : itineraryLayoutMode === 'MAP'
                    ? 'Cartography Map View'
                    : 'List Timeline View'}
              </span>
            </div>

            {/* Desktop View Modes: List vs Split vs Map */}
            <div className="hidden lg:flex items-center p-1 rounded-lg bg-background border border-border text-xs gap-1">
              <button
                type="button"
                onClick={() => setItineraryLayoutMode('LIST')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  itineraryLayoutMode === 'LIST'
                    ? 'bg-surface text-primary-text font-semibold shadow-xs border border-border/80'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>

              <button
                type="button"
                onClick={() => setItineraryLayoutMode('SPLIT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  itineraryLayoutMode === 'SPLIT'
                    ? 'bg-surface text-accent font-semibold shadow-xs border border-border/80'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                <Columns className="w-3.5 h-3.5 text-accent" />
                <span>Split View</span>
              </button>

              <button
                type="button"
                onClick={() => setItineraryLayoutMode('MAP')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  itineraryLayoutMode === 'MAP'
                    ? 'bg-surface text-primary-text font-semibold shadow-xs border border-border/80'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>
            </div>

            {/* Mobile View Toggle: List vs Map */}
            <div className="lg:hidden flex items-center p-1 rounded-lg bg-background border border-border text-xs gap-1">
              <button
                type="button"
                onClick={() => setMobileViewMode('LIST')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                  mobileViewMode === 'LIST'
                    ? 'bg-surface text-primary-text font-semibold shadow-xs border border-border/80'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileViewMode('MAP')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                  mobileViewMode === 'MAP'
                    ? 'bg-surface text-accent font-semibold shadow-xs border border-border/80'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 text-accent" />
                <span>Map</span>
              </button>
            </div>
          </div>

          {/* Pending Suggestions Banner for Active Day */}
          {activeDay && activeDayPendingSuggestions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-accent-bg border border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-primary-text">
                <Lightbulb className="w-4 h-4 text-accent shrink-0" />
                <span>
                  <strong>{activeDayPendingSuggestions.length}</strong> companion{' '}
                  {activeDayPendingSuggestions.length === 1
                    ? 'suggestion'
                    : 'suggestions'}{' '}
                  pending for Day {activeDay.dayNumber}.
                </span>
              </div>
              <button
                onClick={() => {
                  setSugFilterDayId(activeDay.id);
                  setSugFilterStatus('PENDING');
                  setActiveViewTab('SUGGESTIONS');
                }}
                className="text-xs font-semibold text-accent hover:underline self-start sm:self-auto"
              >
                Review &amp; Vote &rarr;
              </button>
            </div>
          )}

          {/* =====================================================================
              DESKTOP VIEW MODE 1: SPLIT VIEW (TIMELINE + STICKY MAP SIDE-BY-SIDE)
              ===================================================================== */}
          {itineraryLayoutMode === 'SPLIT' && (
            <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
            {/* Left Timeline Panel with Smooth Scroll */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-5 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-2">
              {/* Compact Day Selector Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
                {itineraryDays.map((day) => {
                  const isSelected = day.id === activeDay?.id;
                  const actCount = (day.activities || []).length;
                  const dayColor = getDayColor(day.dayNumber);
                  const dayDateLabel = new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setActiveDayId(day.id)}
                      className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-surface text-primary-text border-accent shadow-xs ring-1 ring-accent/30 font-bold'
                          : 'bg-surface border-border text-secondary-text hover:text-primary-text hover:border-accent/40'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: dayColor }}
                        className="w-2 h-2 rounded-full shrink-0"
                      />
                      <span>Day {day.dayNumber}</span>
                      <span className="text-[11px] text-secondary-text/80 font-normal">
                        • {dayDateLabel}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background text-secondary-text font-medium border border-border/60">
                        {actCount}
                      </span>
                    </button>
                  );
                })}

                {isOwner && (
                  <button
                    type="button"
                    onClick={handleOpenAddDay}
                    className="shrink-0 px-3 py-2 rounded-xl bg-surface border border-dashed border-border text-xs text-accent hover:border-accent hover:bg-accent-bg/30 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Day</span>
                  </button>
                )}
              </div>

              {/* Active Day Content */}
              {activeDay ? (
                <div className="bg-surface border border-border rounded-xl p-5 shadow-card space-y-5">
                  {/* Day Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          style={{ color: getDayColor(activeDay.dayNumber) }}
                          className="font-bold text-xs uppercase tracking-wider"
                        >
                          Day {activeDay.dayNumber}
                        </span>
                        <span className="text-xs text-secondary-text">
                          {new Date(activeDay.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-primary-text mt-0.5">
                        {activeDay.title || `Day ${activeDay.dayNumber} Itinerary`}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <button
                          type="button"
                          onClick={handleOpenEditDay}
                          className="p-1.5 rounded-md bg-background border border-border text-secondary-text hover:text-accent transition-colors"
                          title="Edit Day Title & Notes"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenAddActivity}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stop</span>
                      </button>
                    </div>
                  </div>

                  {/* Day Activities List */}
                  <div className="space-y-3">
                    {(activeDay.activities || []).length === 0 ? (
                      <div className="py-12 px-5 rounded-2xl border border-dashed border-border text-center space-y-3 bg-surface/40">
                        <div className="w-10 h-10 rounded-full bg-accent-bg text-accent mx-auto flex items-center justify-center">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm text-primary-text">
                            No stops scheduled for Day {activeDay.dayNumber}
                          </h4>
                          <p className="text-xs text-secondary-text max-w-xs mx-auto">
                            Curate activities, cultural landmarks, reservations, or ask AI for bespoke recommendations.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={handleOpenAddActivity}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Stop</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenConcierge}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-accent/40 text-accent text-xs font-semibold hover:bg-accent-bg transition-colors shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Ask Concierge</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      (activeDay.activities || []).map((activity, index) => {
                        const isFirst = index === 0;
                        const isLast = index === (activeDay.activities || []).length - 1;
                        const isSelected = selectedActivityId === activity.id;
                        const hasCoords =
                          activity.latitude !== null &&
                          activity.latitude !== undefined &&
                          activity.longitude !== null &&
                          activity.longitude !== undefined;
                        const periodInfo = getTimePeriodInfo(activity.startTime);

                        return (
                          <div
                            key={activity.id}
                            id={`activity-${activity.id}`}
                            onClick={() => setSelectedActivityId(activity.id)}
                            onMouseEnter={() => setHoveredActivityId(activity.id)}
                            onMouseLeave={() => setHoveredActivityId(null)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer relative shadow-subtle ${
                              isSelected
                                ? 'bg-accent-bg/30 border-accent ring-2 ring-accent/40 shadow-card'
                                : activity.isCompleted
                                  ? 'bg-background/60 border-border/60 opacity-80'
                                  : 'bg-background hover:bg-surface border-border hover:border-accent/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/40">
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                {/* Completion Checkbox */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleComplete(activity);
                                  }}
                                  aria-label={
                                    activity.isCompleted
                                      ? 'Mark stop incomplete'
                                      : 'Mark stop completed'
                                  }
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    activity.isCompleted
                                      ? 'bg-accent text-surface border-accent'
                                      : 'bg-surface text-transparent border-border hover:border-accent'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>

                                <span
                                  style={{
                                    backgroundColor: getDayColor(activeDay.dayNumber),
                                  }}
                                  className="w-5 h-5 rounded-full text-surface text-[10px] font-bold flex items-center justify-center shrink-0"
                                >
                                  {index + 1}
                                </span>

                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${periodInfo.badgeClass}`}
                                >
                                  {periodInfo.label}
                                </span>

                                {activity.startTime ? (
                                  <span className="font-semibold text-primary-text inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-accent" />
                                    <span>{formatTime(activity.startTime)}</span>
                                  </span>
                                ) : (
                                  <span className="text-secondary-text text-[11px]">
                                    Anytime
                                  </span>
                                )}

                                {activity.durationMinutes && (
                                  <span className="text-[11px] text-secondary-text">
                                    ({formatDuration(activity.durationMinutes)})
                                  </span>
                                )}

                                {hasCoords ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent-bg px-2 py-0.5 rounded-full"
                                    title={`${activity.latitude}, ${activity.longitude}`}
                                  >
                                    <Compass className="w-3 h-3" />
                                    <span>Mapped</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-secondary-text/80 bg-surface px-1.5 py-0.5 rounded border border-border/50">
                                    No pin
                                  </span>
                                )}

                                {activity.isCompleted && (
                                  <span className="text-[10px] font-semibold text-accent uppercase tracking-wider bg-accent-bg px-2 py-0.2 rounded">
                                    Completed
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveActivity(index, 'UP');
                                  }}
                                  className="p-1 text-secondary-text hover:text-primary-text disabled:opacity-20 transition-colors"
                                  title="Move earlier"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveActivity(index, 'DOWN');
                                  }}
                                  className="p-1 text-secondary-text hover:text-primary-text disabled:opacity-20 transition-colors"
                                  title="Move later"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditActivity(activity);
                                  }}
                                  className="p-1 text-secondary-text hover:text-accent transition-colors ml-0.5"
                                  title="Edit stop"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteActivity(activity.id);
                                  }}
                                  className="p-1 text-secondary-text hover:text-rose-600 transition-colors"
                                  title="Delete stop"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-2.5 space-y-1">
                              <h4
                                className={`text-sm font-semibold tracking-tight ${
                                  activity.isCompleted
                                    ? 'line-through text-secondary-text'
                                    : 'text-primary-text'
                                }`}
                              >
                                {activity.title}
                              </h4>
                              {activity.location && (
                                <p className="text-xs text-secondary-text flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <span className="truncate">{activity.location}</span>
                                </p>
                              )}
                              {activity.description && (
                                <p className="text-xs text-secondary-text leading-relaxed pt-1">
                                  {activity.description}
                                </p>
                              )}
                              {activity.notes && (
                                <p className="text-[11px] text-secondary-text italic pt-0.5">
                                  &ldquo;{activity.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right Sticky Map Panel */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-7 sticky top-6">
              <DynamicItineraryMap
                days={itineraryDays}
                activeDayId={activeDayId}
                onSelectDay={(dayId) => setActiveDayId(dayId)}
                selectedActivityId={selectedActivityId}
                onSelectActivity={handleSelectActivityOnMap}
                hoveredActivityId={hoveredActivityId}
                onHoverActivity={setHoveredActivityId}
                suggestions={suggestions}
                selectedSuggestionId={selectedSuggestionId}
                onSelectSuggestion={setSelectedSuggestionId}
                tripDestinationCoords={tripDestinationCoords}
                destinationName={trip?.destination?.name || trip?.title}
                height="calc(100vh - 150px)"
                className="min-h-[550px]"
                onGeocodeUnmapped={handleGeocodeUnmappedActivities}
                isGeocodingUnmapped={isGeocodingUnmapped}
              />
            </div>
          </div>
          )}

          {/* =====================================================================
              DESKTOP VIEW MODE 2: LIST VIEW (TRADITIONAL 2-COLUMN TIMELINE)
              ===================================================================== */}
          {itineraryLayoutMode === 'LIST' && (
            <div className="hidden lg:grid grid-cols-12 gap-8 items-start">
            {/* Left Day Navigator */}
            <div className="col-span-4 bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-3 sticky top-8">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary-text">
                  Itinerary Schedule
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleOpenAddDay}
                    className="text-xs text-accent font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Day</span>
                  </button>
                )}
              </div>

              {/* Days List */}
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {itineraryDays.map((day) => {
                  const isSelected = day.id === activeDay?.id;
                  const actCount = (day.activities || []).length;
                  const completedCount = (day.activities || []).filter(
                    (a) => a.isCompleted,
                  ).length;
                  const dayColor = getDayColor(day.dayNumber);

                  const dateFormatted = new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={day.id}
                      onClick={() => setActiveDayId(day.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-surface border-accent text-primary-text shadow-xs ring-1 ring-accent/30'
                          : 'bg-background hover:bg-surface border-border text-secondary-text hover:text-primary-text'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                            isSelected ? 'text-accent' : 'text-primary-text'
                          }`}
                        >
                          <span
                            style={{ backgroundColor: dayColor }}
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          />
                          <span>Day {day.dayNumber}</span>
                        </span>
                        <span className="text-[11px] text-secondary-text font-medium">
                          {dateFormatted}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary-text truncate max-w-[170px]">
                          {day.title || `Day ${day.dayNumber} Exploration`}
                        </span>
                        <span className="text-[11px] text-secondary-text shrink-0 px-2 py-0.5 rounded-full bg-surface border border-border/60">
                          {completedCount}/{actCount} stops
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Main Timeline Column */}
            <div className="col-span-8 space-y-6">
              {activeDay ? (
                <div className="bg-surface border border-border rounded-xl p-5 sm:p-8 shadow-card space-y-6">
                  {/* Active Day Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            backgroundColor: `${getDayColor(activeDay.dayNumber)}15`,
                            color: getDayColor(activeDay.dayNumber),
                          }}
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-border/40"
                        >
                          Day {activeDay.dayNumber}
                        </span>
                        <span className="text-xs text-secondary-text">
                          {new Date(activeDay.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h3 className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight">
                        {activeDay.title || `Day ${activeDay.dayNumber} Schedule`}
                      </h3>

                      {activeDay.notes && (
                        <p className="text-xs text-secondary-text max-w-xl leading-relaxed pt-1">
                          {activeDay.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenEditDay}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Day</span>
                          </button>

                          {itineraryDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setIsDeleteDayOpen(true)}
                              className="p-1.5 rounded-md bg-background border border-border text-secondary-text hover:text-rose-600 hover:border-rose-200 transition-colors"
                              aria-label="Delete this day"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={handleOpenAddActivity}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stop</span>
                      </button>
                    </div>
                  </div>

                  {/* Activities Timeline */}
                  <div className="space-y-4">
                    {(activeDay.activities || []).length === 0 ? (
                      <div className="py-12 px-6 rounded-xl border border-dashed border-border text-center space-y-3 bg-background/50">
                        <div className="w-10 h-10 rounded-full bg-accent-bg text-accent mx-auto flex items-center justify-center">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm text-primary-text">
                            No stops scheduled for Day {activeDay.dayNumber}
                          </h4>
                          <p className="text-xs text-secondary-text max-w-md mx-auto">
                            Add visits to historic temples, scenic lookouts, breakfast
                            cafes, or private tours to fill this day&apos;s itinerary.
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleOpenAddActivity}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Activity</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                        {(activeDay.activities || []).map((activity, index) => {
                          const isFirst = index === 0;
                          const isLast =
                            index === (activeDay.activities || []).length - 1;
                          const isSelected = selectedActivityId === activity.id;
                          const hasCoords =
                            activity.latitude !== null &&
                            activity.latitude !== undefined &&
                            activity.longitude !== null &&
                            activity.longitude !== undefined;
                          const periodInfo = getTimePeriodInfo(activity.startTime);

                          return (
                            <div
                              key={activity.id}
                              id={`activity-${activity.id}`}
                              onClick={() => setSelectedActivityId(activity.id)}
                              onMouseEnter={() => setHoveredActivityId(activity.id)}
                              onMouseLeave={() => setHoveredActivityId(null)}
                              className={`relative bg-background border rounded-xl p-4 sm:p-5 transition-all cursor-pointer shadow-subtle ${
                                isSelected
                                  ? 'border-accent ring-2 ring-accent/30 bg-accent-bg/15 shadow-card'
                                  : activity.isCompleted
                                    ? 'border-border/60 bg-background/50 opacity-80'
                                    : 'border-border hover:border-accent/40 bg-background'
                              }`}
                            >
                              {/* Timeline Node Dot */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleComplete(activity);
                                }}
                                className={`absolute -left-6 sm:-left-8 top-4 -translate-x-1/2 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                                  activity.isCompleted
                                    ? 'bg-accent text-surface border-accent'
                                    : 'bg-surface text-transparent border-border hover:border-accent'
                                }`}
                                aria-label={
                                  activity.isCompleted
                                    ? 'Mark activity incomplete'
                                    : 'Mark activity completed'
                                }
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>

                              {/* Top Row: Time, Duration & Controls */}
                              <div className="flex items-start justify-between gap-3 pb-2 border-b border-border/40">
                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  <span
                                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${periodInfo.badgeClass}`}
                                  >
                                    {periodInfo.label}
                                  </span>

                                  {activity.startTime ? (
                                    <span className="inline-flex items-center gap-1 font-semibold text-primary-text bg-surface px-2 py-0.5 rounded border border-border">
                                      <Clock className="w-3 h-3 text-accent" />
                                      <span>{formatTime(activity.startTime)}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-secondary-text">
                                      Anytime
                                    </span>
                                  )}

                                  {activity.durationMinutes && (
                                    <span className="text-[11px] text-secondary-text">
                                      ({formatDuration(activity.durationMinutes)})
                                    </span>
                                  )}

                                  {hasCoords ? (
                                    <span
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent-bg px-2 py-0.5 rounded-full"
                                      title={`${activity.latitude}, ${activity.longitude}`}
                                    >
                                      <Compass className="w-3 h-3" />
                                      <span>Mapped</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-secondary-text bg-background px-1.5 py-0.5 rounded border border-border/60">
                                      No pin
                                    </span>
                                  )}

                                  {activity.isCompleted && (
                                    <span className="text-[10px] font-semibold text-accent uppercase tracking-wider bg-accent-bg px-2 py-0.2 rounded">
                                      Completed
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={isFirst}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveActivity(index, 'UP');
                                    }}
                                    aria-label="Move stop earlier"
                                    className="p-1 rounded text-secondary-text hover:text-primary-text disabled:opacity-20 disabled:hover:text-secondary-text transition-colors"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isLast}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveActivity(index, 'DOWN');
                                    }}
                                    aria-label="Move stop later"
                                    className="p-1 rounded text-secondary-text hover:text-primary-text disabled:opacity-20 disabled:hover:text-secondary-text transition-colors"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditActivity(activity);
                                    }}
                                    aria-label="Edit stop"
                                    className="p-1 rounded text-secondary-text hover:text-accent transition-colors ml-1"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteActivity(activity.id);
                                    }}
                                    aria-label="Delete stop"
                                    className="p-1 rounded text-secondary-text hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2.5 space-y-1.5">
                                <h4
                                  className={`font-semibold text-base tracking-tight text-primary-text ${
                                    activity.isCompleted
                                      ? 'line-through text-secondary-text'
                                      : ''
                                  }`}
                                >
                                  {activity.title}
                                </h4>

                                {activity.location && (
                                  <p className="text-xs text-secondary-text flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                                    <span>{activity.location}</span>
                                  </p>
                                )}

                                {activity.description && (
                                  <p className="text-xs text-secondary-text leading-relaxed pt-1">
                                    {activity.description}
                                  </p>
                                )}

                                {activity.notes && (
                                  <div className="p-2.5 rounded-lg bg-surface border border-border/80 text-[11px] text-primary-text mt-2 flex items-start gap-2">
                                    <FileText className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">
                                      {activity.notes}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-xl p-8 text-center text-xs text-secondary-text">
                  No itinerary day selected.
                </div>
              )}
            </div>
          </div>
          )}

          {/* =====================================================================
              DESKTOP VIEW MODE 3: FULL MAP VIEW
              ===================================================================== */}
          {itineraryLayoutMode === 'MAP' && (
            <div className="hidden lg:block space-y-4">
              <DynamicItineraryMap
                days={itineraryDays}
                activeDayId={activeDayId}
                onSelectDay={(dayId) => setActiveDayId(dayId)}
                selectedActivityId={selectedActivityId}
                onSelectActivity={handleSelectActivityOnMap}
                hoveredActivityId={hoveredActivityId}
                onHoverActivity={setHoveredActivityId}
                suggestions={suggestions}
                selectedSuggestionId={selectedSuggestionId}
                onSelectSuggestion={setSelectedSuggestionId}
                tripDestinationCoords={tripDestinationCoords}
                destinationName={trip?.destination?.name || trip?.title}
                height="calc(100vh - 220px)"
                className="min-h-[600px] w-full"
                onGeocodeUnmapped={handleGeocodeUnmappedActivities}
                isGeocodingUnmapped={isGeocodingUnmapped}
              />

              {/* Quick Stop Navigator Bar for Map Mode */}
              {activeDay && (
                <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-x-auto py-1">
                    <span
                      style={{ color: getDayColor(activeDay.dayNumber) }}
                      className="text-xs font-bold uppercase tracking-wider shrink-0"
                    >
                      Day {activeDay.dayNumber} Stops:
                    </span>
                    {(activeDay.activities || []).map((act, idx) => {
                      const isSel = act.id === selectedActivityId;
                      const hasCoords = act.latitude !== null && act.longitude !== null;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => handleSelectActivityOnMap(act.id)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${
                            isSel
                              ? 'bg-accent text-surface border-accent shadow-xs'
                              : 'bg-background hover:bg-surface border-border text-primary-text'
                          }`}
                        >
                          <span className="font-bold text-[10px] w-4 h-4 rounded-full bg-black/10 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[140px]">{act.title}</span>
                          {hasCoords ? (
                            <Compass className="w-3 h-3 text-accent" />
                          ) : (
                            <span className="text-[9px] opacity-60">no pin</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              MOBILE LAYOUT (LIST / MAP TOGGLE - NO CRAMPED SPLIT LAYOUT)
              ===================================================================== */}
          <div className="lg:hidden space-y-4">
            {/* Horizontal Day Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {itineraryDays.map((day) => {
                const isSelected = day.id === activeDay?.id;
                const actCount = (day.activities || []).length;
                const dayColor = getDayColor(day.dayNumber);

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setActiveDayId(day.id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-surface text-primary-text border-accent shadow-subtle font-bold'
                        : 'bg-surface border-border text-secondary-text hover:text-primary-text'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: dayColor }}
                      className="w-2 h-2 rounded-full shrink-0"
                    />
                    <span>Day {day.dayNumber}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background text-secondary-text font-normal">
                      {actCount}
                    </span>
                  </button>
                );
              })}

              {isOwner && (
                <button
                  type="button"
                  onClick={handleOpenAddDay}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-surface border border-dashed border-border text-xs text-accent hover:border-accent flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Day</span>
                </button>
              )}
            </div>

            {/* If Mobile Mode is MAP: Render Mobile Map View */}
            {mobileViewMode === 'MAP' ? (
              <div className="space-y-4">
                <DynamicItineraryMap
                  days={itineraryDays}
                  activeDayId={activeDayId}
                  onSelectDay={(dayId) => setActiveDayId(dayId)}
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={handleSelectActivityOnMap}
                  hoveredActivityId={hoveredActivityId}
                  onHoverActivity={setHoveredActivityId}
                  suggestions={suggestions}
                  selectedSuggestionId={selectedSuggestionId}
                  onSelectSuggestion={setSelectedSuggestionId}
                  tripDestinationCoords={tripDestinationCoords}
                  destinationName={trip?.destination?.name || trip?.title}
                  height="460px"
                  className="w-full"
                  onGeocodeUnmapped={handleGeocodeUnmappedActivities}
                  isGeocodingUnmapped={isGeocodingUnmapped}
                />

                {/* Day Stops Summary below Mobile Map */}
                {activeDay && (
                  <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="font-semibold text-xs text-primary-text">
                        Day {activeDay.dayNumber} Itinerary Stops
                      </span>
                      <span className="text-[11px] text-secondary-text">
                        {(activeDay.activities || []).length} stops
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(activeDay.activities || []).map((activity, idx) => {
                        const isSelected = selectedActivityId === activity.id;
                        return (
                          <div
                            key={activity.id}
                            onClick={() => setSelectedActivityId(activity.id)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-accent-bg/40 border-accent font-medium'
                                : 'bg-background border-border text-secondary-text'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary-text">
                                {idx + 1}. {activity.title}
                              </span>
                              {activity.startTime && (
                                <span className="text-[11px] text-accent font-semibold">
                                  {formatTime(activity.startTime)}
                                </span>
                              )}
                            </div>
                            {activity.location && (
                              <p className="text-[11px] text-secondary-text flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-accent" />
                                <span>{activity.location}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* If Mobile Mode is LIST: Render Standard Timeline Cards */
              activeDay && (
                <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <span className="text-xs font-bold text-accent uppercase tracking-wider">
                        Day {activeDay.dayNumber}
                      </span>
                      <h3 className="font-semibold text-lg text-primary-text">
                        {activeDay.title || `Day ${activeDay.dayNumber} Schedule`}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddActivity}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-surface text-xs font-semibold shadow-subtle"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Stop</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(activeDay.activities || []).map((activity, index) => {
                      const isFirst = index === 0;
                      const isLast =
                        index === (activeDay.activities || []).length - 1;
                      const isSelected = selectedActivityId === activity.id;
                      const periodInfo = getTimePeriodInfo(activity.startTime);

                      return (
                        <div
                          key={activity.id}
                          id={`activity-mobile-${activity.id}`}
                          onClick={() => setSelectedActivityId(activity.id)}
                          className={`p-3.5 rounded-xl border bg-background transition-all shadow-subtle ${
                            isSelected
                              ? 'border-accent ring-2 ring-accent/30 bg-accent-bg/15'
                              : activity.isCompleted
                                ? 'border-border/60 bg-background/50 opacity-80'
                                : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between pb-1.5 border-b border-border/40 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Completion Checkbox */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleComplete(activity);
                                }}
                                aria-label={
                                  activity.isCompleted
                                    ? 'Mark stop incomplete'
                                    : 'Mark stop completed'
                                }
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  activity.isCompleted
                                    ? 'bg-accent text-surface border-accent'
                                    : 'bg-surface text-transparent border-border hover:border-accent'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                              </button>

                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full border ${periodInfo.badgeClass}`}
                              >
                                {periodInfo.label}
                              </span>

                              <span className="font-semibold text-primary-text">
                                {activity.startTime
                                  ? formatTime(activity.startTime)
                                  : 'Anytime'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveActivity(index, 'UP');
                                }}
                                className="p-1 text-secondary-text disabled:opacity-20"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveActivity(index, 'DOWN');
                                }}
                                className="p-1 text-secondary-text disabled:opacity-20"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditActivity(activity);
                                }}
                                className="p-1 text-secondary-text"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteActivity(activity.id);
                                }}
                                className="p-1 text-secondary-text hover:text-rose-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 space-y-1">
                            <h4
                              className={`text-sm font-semibold ${
                                activity.isCompleted
                                  ? 'line-through text-secondary-text'
                                  : 'text-primary-text'
                              }`}
                            >
                              {activity.title}
                            </h4>
                            {activity.location && (
                              <p className="text-xs text-secondary-text flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-accent" />
                                <span>{activity.location}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: ACTIVITY SUGGESTIONS & VOTING
          ========================================================================= */}
      {activeViewTab === 'SUGGESTIONS' && (
        <div className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg text-primary-text">
                Companion Activity Suggestions
              </h3>
              <p className="text-xs text-secondary-text mt-0.5">
                Vote on group recommendations. Trip owners can approve high-voted
                suggestions directly into the itinerary.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Day filter */}
              <select
                value={sugFilterDayId}
                onChange={(e) => setSugFilterDayId(e.target.value)}
                className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-primary-text focus:outline-none"
              >
                <option value="ALL">All Days</option>
                {itineraryDays.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={sugFilterStatus}
                onChange={(e) => setSugFilterStatus(e.target.value)}
                className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-primary-text focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Votes</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <button
                type="button"
                onClick={handleOpenAddSuggestion}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Suggest Stop</span>
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          {filteredSuggestions.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center text-xs text-secondary-text space-y-3 shadow-subtle">
              <div className="w-10 h-10 rounded-full bg-accent-bg text-accent mx-auto flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <p className="font-semibold text-primary-text text-sm">
                No activity suggestions found
              </p>
              <p className="max-w-sm mx-auto">
                Have a great spot or side trip in mind? Propose an activity and let your
                travel companions vote!
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenAddSuggestion}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Suggest an Activity</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuggestions.map((sug) => {
                const targetDay = itineraryDays.find((d) => d.id === sug.itineraryDayId);
                const isPending = sug.status === 'PENDING';
                const isApproved = sug.status === 'APPROVED';
                const isRejected = sug.status === 'REJECTED';

                return (
                  <div
                    key={sug.id}
                    className="bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Top Badges: Day & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-background border border-border text-primary-text uppercase tracking-wider">
                          Day {targetDay?.dayNumber || 1}
                        </span>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isRejected
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {sug.status}
                        </span>
                      </div>

                      {/* Title & Info */}
                      <div>
                        <h4 className="font-semibold text-base text-primary-text">
                          {sug.title}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-secondary-text mt-1 flex-wrap">
                          {sug.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-accent" />
                              <span>{formatTime(sug.startTime)}</span>
                            </span>
                          )}
                          {sug.durationMinutes && (
                            <span>({formatDuration(sug.durationMinutes)})</span>
                          )}
                          {sug.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-accent" />
                              <span>{sug.location}</span>
                            </span>
                          )}
                        </div>

                        {sug.description && (
                          <p className="text-xs text-secondary-text mt-2 leading-relaxed">
                            {sug.description}
                          </p>
                        )}
                      </div>

                      {/* Suggested By */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border text-xs text-secondary-text">
                        <div className="w-5 h-5 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-[10px]">
                          {sug.suggestedBy.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">
                          Suggested by{' '}
                          <strong className="text-primary-text">
                            {sug.suggestedBy.name}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions: Voting & Owner Decision */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                      {/* Vote Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleVote(sug)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          sug.hasVoted
                            ? 'bg-accent text-surface border-accent'
                            : 'bg-background border-border text-primary-text hover:border-accent'
                        }`}
                        title={sug.hasVoted ? 'Click to remove vote' : 'Click to vote'}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>
                          {sug.voteCount} {sug.voteCount === 1 ? 'Vote' : 'Votes'}
                        </span>
                        {sug.hasVoted && (
                          <span className="text-[10px] opacity-80">(Voted)</span>
                        )}
                      </button>

                      {/* Owner Approval / Rejection Controls */}
                      {isOwner && isPending && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveSuggestion(sug.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-surface text-xs font-semibold transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve &amp; Add</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectSuggestion(sug.id)}
                            className="px-2.5 py-1.5 rounded-md bg-background border border-border text-secondary-text hover:text-rose-600 text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: AI TRAVEL CONCIERGE WORKBENCH (MILESTONE 7, STAGE 4C)
          ========================================================================= */}
      {activeViewTab === 'CONCIERGE' && trip && (
        <ConciergeReviewWorkbench
          trip={trip}
          itineraryDays={itineraryDays}
          response={conciergeResponse}
          proposals={proposalsDraft}
          onUpdateProposals={setProposalsDraft}
          onOpenPreferences={() => setIsConciergeDrawerOpen(true)}
          isGenerating={isGeneratingSuggestions}
          onImport={handleImportProposals}
          isImporting={isImportingProposals}
          onBackToItinerary={() => setActiveViewTab('TIMELINE')}
        />
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* 1. Suggest Activity Modal (Milestone 6) */}
      {isAddSuggestionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingSuggestion && setIsAddSuggestionOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lifted p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-xl text-primary-text">
                  Suggest Activity for Voting
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSuggestionOpen(false)}
                className="p-1 rounded-md text-secondary-text hover:text-primary-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-secondary-text leading-relaxed">
              Propose an experience, restaurant, or excursion. Companions will vote on
              this recommendation, and the trip owner can approve it directly into the
              verified schedule.
            </p>

            {suggestionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {suggestionError}
              </div>
            )}

            <form onSubmit={handleCreateSuggestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary-text mb-1">
                  Target Itinerary Day *
                </label>
                <select
                  value={sugDayId}
                  onChange={(e) => setSugDayId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {itineraryDays.map((d) => (
                    <option key={d.id} value={d.id}>
                      Day {d.dayNumber} (
                      {new Date(d.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      ) — {d.title || `Day ${d.dayNumber}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary-text mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset Kayaking at Sea Caves"
                  value={sugTitle}
                  onChange={(e) => setSugTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary-text mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. South Marina Kayak Pier"
                  value={sugLocation}
                  onChange={(e) => setSugLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Suggestion Coordinates Section */}
              <div className="p-3 rounded-lg bg-background border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-primary-text flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-accent" />
                    <span>Map Coordinates (Optional)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {tripDestinationCoords && (
                      <button
                        type="button"
                        onClick={handleUseDestinationCoordsForSuggestion}
                        className="text-[10px] font-medium text-accent hover:underline px-1.5 py-0.5 rounded hover:bg-accent-bg transition-colors"
                      >
                        Use Destination Pin
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isGeocodingSuggestion || !sugLocation.trim()}
                      onClick={handleGeocodeSuggestionLocation}
                      className="text-[10px] font-medium text-primary-text hover:text-accent hover:underline px-1.5 py-0.5 rounded hover:bg-[#EFECE5] transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      <Search className="w-3 h-3" />
                      <span>{isGeocodingSuggestion ? 'Locating...' : 'Locate'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-secondary-text mb-0.5">
                      Latitude (-90 to 90)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      placeholder="e.g. 35.0116"
                      value={sugLatitude}
                      onChange={(e) => {
                        setSugLatitude(e.target.value);
                        setSugCoordError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-secondary-text mb-0.5">
                      Longitude (-180 to 180)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      placeholder="e.g. 135.7681"
                      value={sugLongitude}
                      onChange={(e) => {
                        setSugLongitude(e.target.value);
                        setSugCoordError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                {sugCoordError && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {sugCoordError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-primary-text mb-1">
                    Suggested Time
                  </label>
                  <input
                    type="time"
                    value={sugStartTime}
                    onChange={(e) => setSugStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary-text mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sugDuration}
                    onChange={(e) => setSugDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary-text mb-1">
                  Description / Why you recommend it
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Highly reviewed on TripAdvisor, rental includes paddles and wetsuits..."
                  value={sugDescription}
                  onChange={(e) => setSugDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingSuggestion}
                  onClick={() => setIsAddSuggestionOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSuggestion}
                  className="px-5 py-2 rounded-md text-xs font-semibold text-surface bg-accent hover:bg-accent-hover transition-colors shadow-subtle flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingSuggestion ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Activity Modal */}
      {isAddActivityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingActivity && setIsAddActivityOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lifted p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Day {activeDay?.dayNumber} Activity
                </span>
                <h3 className="font-semibold text-xl text-primary-text">
                  Add New Activity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddActivityOpen(false)}
                className="p-1 rounded-md text-secondary-text hover:text-primary-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Activity Title <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bamboo Grove Sunrise Walk & Photography"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Location / Venue
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-secondary-text absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Arashiyama Bamboo Grove, Ukyo Ward"
                    value={actLocation}
                    onChange={(e) => setActLocation(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Geographic Coordinates Section */}
              <div className="p-3 rounded-lg bg-background border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-primary-text flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-accent" />
                    <span>Map Coordinates (Optional)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {tripDestinationCoords && (
                      <button
                        type="button"
                        onClick={handleUseDestinationCoordsForActivity}
                        className="text-[10px] font-medium text-accent hover:underline px-1.5 py-0.5 rounded hover:bg-accent-bg transition-colors"
                      >
                        Use Destination Pin
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isGeocodingActivity || !actLocation.trim()}
                      onClick={handleGeocodeActivityLocation}
                      className="text-[10px] font-medium text-primary-text hover:text-accent hover:underline px-1.5 py-0.5 rounded hover:bg-[#EFECE5] transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      <Search className="w-3 h-3" />
                      <span>{isGeocodingActivity ? 'Locating...' : 'Locate'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-secondary-text mb-0.5">
                      Latitude (-90 to 90)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      placeholder="e.g. 35.0116"
                      value={actLatitude}
                      onChange={(e) => {
                        setActLatitude(e.target.value);
                        setActCoordError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-secondary-text mb-0.5">
                      Longitude (-180 to 180)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      placeholder="e.g. 135.7681"
                      value={actLongitude}
                      onChange={(e) => {
                        setActLongitude(e.target.value);
                        setActCoordError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                {actCoordError && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {actCoordError}
                  </p>
                )}
                <p className="text-[10px] text-secondary-text leading-tight">
                  Both latitude and longitude are needed to draw daily route polylines and numbered stops on your map canvas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">
                    Scheduled Start Time
                  </label>
                  <input
                    type="time"
                    value={actStartTime}
                    onChange={(e) => setActStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={15}
                    placeholder="e.g. 90"
                    value={actDuration}
                    onChange={(e) => setActDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Highlight key sights, walking paths or guided details..."
                  value={actDescription}
                  onChange={(e) => setActDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Helpful Notes / Reservation Info
                </label>
                <textarea
                  rows={2}
                  placeholder="Booking codes, attire, footwear tips, tickets..."
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingActivity}
                  onClick={() => setIsAddActivityOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingActivity}
                  className="px-5 py-2 rounded-md text-xs font-semibold text-surface bg-accent hover:bg-accent-hover transition-colors shadow-subtle flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingActivity ? 'Adding Stop...' : 'Add Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Activity Modal */}
      {isEditActivityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingActivity && setIsEditActivityOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lifted p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-xl text-primary-text">Edit Activity</h3>
              <button
                type="button"
                onClick={() => setIsEditActivityOpen(false)}
                className="p-1 rounded-md text-secondary-text hover:text-primary-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Activity Title <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  value={actLocation}
                  onChange={(e) => setActLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Geographic Coordinates Section */}
              <div className="p-3 rounded-lg bg-background border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-primary-text flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-accent" />
                    <span>Map Coordinates (Optional)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {tripDestinationCoords && (
                      <button
                        type="button"
                        onClick={handleUseDestinationCoordsForActivity}
                        className="text-[10px] font-medium text-accent hover:underline px-1.5 py-0.5 rounded hover:bg-accent-bg transition-colors"
                      >
                        Use Destination Pin
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isGeocodingActivity || !actLocation.trim()}
                      onClick={handleGeocodeActivityLocation}
                      className="text-[10px] font-medium text-primary-text hover:text-accent hover:underline px-1.5 py-0.5 rounded hover:bg-[#EFECE5] transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      <Search className="w-3 h-3" />
                      <span>{isGeocodingActivity ? 'Locating...' : 'Locate'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-secondary-text mb-0.5">
                      Latitude (-90 to 90)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      placeholder="e.g. 35.0116"
                      value={actLatitude}
                      onChange={(e) => {
                        setActLatitude(e.target.value);
                        setActCoordError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-secondary-text mb-0.5">
                      Longitude (-180 to 180)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      placeholder="e.g. 135.7681"
                      value={actLongitude}
                      onChange={(e) => {
                        setActLongitude(e.target.value);
                        setActCoordError(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                {actCoordError && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {actCoordError}
                  </p>
                )}
                <p className="text-[10px] text-secondary-text leading-tight">
                  Both latitude and longitude are needed to draw daily route polylines and numbered stops on your map canvas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">
                    Scheduled Start Time
                  </label>
                  <input
                    type="time"
                    value={actStartTime}
                    onChange={(e) => setActStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={15}
                    value={actDuration}
                    onChange={(e) => setActDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={actDescription}
                  onChange={(e) => setActDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Helpful Notes / Reservation Info
                </label>
                <textarea
                  rows={2}
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingActivity}
                  onClick={() => setIsEditActivityOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingActivity}
                  className="px-5 py-2 rounded-md text-xs font-semibold text-surface bg-accent hover:bg-accent-hover transition-colors shadow-subtle flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingActivity ? 'Saving...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Day Modal (Owner Only) */}
      {isEditDayOpen && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingDay && setIsEditDayOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-lifted p-6 z-10 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-lg text-primary-text">
                Edit Day {activeDay?.dayNumber}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditDayOpen(false)}
                className="p-1 rounded-md text-secondary-text hover:text-primary-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDay} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Day Focus / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alpine Gondola & Summit Lunch"
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Day Notes &amp; Highlights
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Check out before 11 AM, luggage transfer scheduled at front desk..."
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingDay}
                  onClick={() => setIsEditDayOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDay}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-surface bg-accent hover:bg-accent-hover transition-colors shadow-subtle disabled:opacity-50"
                >
                  {isSavingDay ? 'Saving...' : 'Update Day'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Day Modal (Owner Only) */}
      {isAddDayOpen && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingDay && setIsAddDayOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-lifted p-6 z-10 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-lg text-primary-text">
                Add Itinerary Day
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDayOpen(false)}
                className="p-1 rounded-md text-secondary-text hover:text-primary-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDay} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">
                    Day Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newDayNumber}
                    onChange={(e) => setNewDayNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">
                    Calendar Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDayDate}
                    onChange={(e) => setNewDayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Day Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bonus Exploration Day"
                  value={newDayTitle}
                  onChange={(e) => setNewDayTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={newDayNotes}
                  onChange={(e) => setNewDayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingDay}
                  onClick={() => setIsAddDayOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDay}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-surface bg-accent hover:bg-accent-hover transition-colors shadow-subtle disabled:opacity-50"
                >
                  {isSavingDay ? 'Adding Day...' : 'Add Day'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Day Confirmation Modal (Owner Only) */}
      {isDeleteDayOpen && activeDay && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingDay && setIsDeleteDayOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-lifted p-6 z-10 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-primary-text">
                Delete Day {activeDay.dayNumber}?
              </h3>
              <p className="text-xs text-secondary-text mt-1 leading-relaxed">
                Are you sure you want to remove Day {activeDay.dayNumber} (
                {new Date(activeDay.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                )? All {(activeDay.activities || []).length} activities planned for this
                day will be deleted.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSavingDay}
                onClick={() => setIsDeleteDayOpen(false)}
                className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingDay}
                onClick={handleDeleteDay}
                className="px-4 py-2 rounded-md text-xs font-semibold text-surface bg-rose-600 hover:bg-rose-700 transition-colors shadow-subtle disabled:opacity-50"
              >
                {isSavingDay ? 'Deleting...' : 'Delete Day'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Concierge Preferences Drawer (Milestone 7, Stage 4C) */}
      <ConciergePreferencesDrawer
        isOpen={isConciergeDrawerOpen}
        onClose={() => setIsConciergeDrawerOpen(false)}
        onGenerate={handleGenerateSuggestions}
        isGenerating={isGeneratingSuggestions}
        initialPreferences={conciergePreferences}
        destinationName={trip?.destination?.name}
        tripTitle={trip?.title}
        dayCount={itineraryDays.length}
        error={conciergeError}
      />
    </div>
  );
}

export default function TripItineraryPage() {
  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle="Itinerary Planner"
        pageSubtitle="Curate daily journeys, activities and interactive cartography"
      >
        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 py-16 text-center text-xs text-secondary-text">
              Loading itinerary planner...
            </div>
          }
        >
          <ItineraryPlannerContent />
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}
