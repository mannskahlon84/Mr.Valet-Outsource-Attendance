"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

interface RouteAllocation {
    supplier_id: string;
    requested_quantity: string;
}

interface ShiftConfig {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    totalWorkers: string;
    skillCategory: string;
    notes: string;
    routes: RouteAllocation[];
}

const PRESET_SHIFTS = [
    { label: '☀️ Morning', start: '08:00', end: '16:00' },
    { label: '🌆 Evening', start: '16:00', end: '00:00' },
    { label: '🌙 Night', start: '00:00', end: '08:00' },
    { label: '⏱️ Full Day', start: '08:00', end: '20:00' },
];

export default function NewShiftRequest() {
    const router = useRouter();
    const [sites, setSites] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [managerName, setManagerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [error, setError] = useState('');

    // Shared Header Form Fields
    const [siteId, setSiteId] = useState('');
    const [requiredDate, setRequiredDate] = useState('');

    // Shifts Array (defaults to 1 shift)
    const [shifts, setShifts] = useState<ShiftConfig[]>([
        {
            id: 'shift-1',
            name: 'Shift 1',
            startTime: '08:00',
            endTime: '16:00',
            totalWorkers: '5',
            skillCategory: 'Valet Driver',
            notes: '',
            routes: [{ supplier_id: '', requested_quantity: '5' }]
        }
    ]);

    useEffect(() => {
        // Default required date: tomorrow
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        setRequiredDate(tmrw.toISOString().split('T')[0]);

        const savedName = localStorage.getItem('name') || '';
        setManagerName(savedName);

        Promise.all([
            fetchApi('/sites/').catch(() => []),
            fetchApi('/suppliers/').catch(() => [])
        ]).then(([s, sup]) => {
            setSites(s || []);
            setSuppliers(sup || []);
            if (s && s.length > 0) setSiteId(s[0].id.toString());
            if (sup && sup.length > 0) {
                setShifts(prev => prev.map(sh => ({
                    ...sh,
                    routes: [{ supplier_id: sup[0].id.toString(), requested_quantity: sh.totalWorkers || '5' }]
                })));
            }
        }).finally(() => setLoading(false));
    }, []);

    // --- Shift Management Helpers ---
    const addShift = () => {
        const nextIdx = shifts.length + 1;
        let defaultStart = '16:00';
        let defaultEnd = '00:00';
        let labelName = `Shift ${nextIdx}`;

        if (shifts.length === 1) {
            defaultStart = '16:00';
            defaultEnd = '00:00';
            labelName = `Shift 2`;
        } else if (shifts.length === 2) {
            defaultStart = '00:00';
            defaultEnd = '08:00';
            labelName = `Shift 3`;
        } else {
            defaultStart = '08:00';
            defaultEnd = '16:00';
            labelName = `Shift ${nextIdx}`;
        }

        const initialSup = suppliers.length > 0 ? suppliers[0].id.toString() : '';
        const newShift: ShiftConfig = {
            id: `shift-${Date.now()}`,
            name: labelName,
            startTime: defaultStart,
            endTime: defaultEnd,
            totalWorkers: '5',
            skillCategory: 'Valet Driver',
            notes: '',
            routes: [{ supplier_id: initialSup, requested_quantity: '5' }]
        };

        setShifts([...shifts, newShift]);
    };

    const removeShift = (shiftIndex: number) => {
        if (shifts.length <= 1) return;
        setShifts(shifts.filter((_, idx) => idx !== shiftIndex));
    };

    const updateShift = (shiftIndex: number, field: keyof ShiftConfig, val: any) => {
        setShifts(prev => {
            const next = [...prev];
            next[shiftIndex] = { ...next[shiftIndex], [field]: val };
            return next;
        });
    };

    const applyTimingPreset = (shiftIndex: number, preset: typeof PRESET_SHIFTS[0]) => {
        setShifts(prev => {
            const next = [...prev];
            next[shiftIndex] = {
                ...next[shiftIndex],
                startTime: preset.start,
                endTime: preset.end,
                name: `Shift ${shiftIndex + 1} (${preset.label.replace(/^[^\w]+/, '').trim()})`
            };
            return next;
        });
    };

    // --- Agency Route Management per Shift ---
    const addRoute = (shiftIndex: number) => {
        setShifts(prev => {
            const next = [...prev];
            const currentRoutes = next[shiftIndex].routes;
            const availableSup = suppliers.find(s => !currentRoutes.some(r => r.supplier_id === s.id.toString()));
            next[shiftIndex] = {
                ...next[shiftIndex],
                routes: [
                    ...currentRoutes,
                    { supplier_id: availableSup ? availableSup.id.toString() : (suppliers[0]?.id.toString() || ''), requested_quantity: '1' }
                ]
            };
            return next;
        });
    };

    const removeRoute = (shiftIndex: number, routeIndex: number) => {
        setShifts(prev => {
            const next = [...prev];
            next[shiftIndex] = {
                ...next[shiftIndex],
                routes: next[shiftIndex].routes.filter((_, idx) => idx !== routeIndex)
            };
            return next;
        });
    };

    const updateRoute = (shiftIndex: number, routeIndex: number, field: 'supplier_id' | 'requested_quantity', val: string) => {
        setShifts(prev => {
            const next = [...prev];
            const newRoutes = [...next[shiftIndex].routes];
            newRoutes[routeIndex] = { ...newRoutes[routeIndex], [field]: val };
            next[shiftIndex] = { ...next[shiftIndex], routes: newRoutes };
            return next;
        });
    };

    // --- Form Submission ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!siteId) {
            setError('Please select a target location.');
            return;
        }

        if (!requiredDate) {
            setError('Please select the required date.');
            return;
        }

        // Validate each shift
        for (let i = 0; i < shifts.length; i++) {
            const sh = shifts[i];
            const totalReq = parseInt(sh.totalWorkers, 10);
            if (isNaN(totalReq) || totalReq <= 0) {
                setError(`Shift #${i + 1} (${sh.name}): Total workers must be at least 1.`);
                return;
            }

            const validRoutes = sh.routes.map(r => ({
                supplier_id: parseInt(r.supplier_id, 10),
                requested_quantity: parseInt(r.requested_quantity, 10)
            })).filter(r => !isNaN(r.supplier_id) && r.requested_quantity > 0);

            if (validRoutes.length === 0) {
                setError(`Shift #${i + 1} (${sh.name}): Please allocate at least one supplier agency.`);
                return;
            }

            const routedSum = validRoutes.reduce((acc, curr) => acc + curr.requested_quantity, 0);
            if (routedSum > totalReq) {
                setError(`Shift #${i + 1} (${sh.name}): Total routed drivers (${routedSum}) exceeds required workers (${totalReq}).`);
                return;
            }
        }

        setSubmitting(true);

        try {
            // Submit each shift sequentially
            for (let i = 0; i < shifts.length; i++) {
                const sh = shifts[i];
                setSubmitStatus(`Dispatching shift ${i + 1} of ${shifts.length} (${sh.name})...`);

                const validRoutes = sh.routes.map(r => ({
                    supplier_id: parseInt(r.supplier_id, 10),
                    requested_quantity: parseInt(r.requested_quantity, 10)
                })).filter(r => !isNaN(r.supplier_id) && r.requested_quantity > 0);

                const body = {
                    site_id: parseInt(siteId, 10),
                    required_date: requiredDate,
                    start_time: sh.startTime,
                    end_time: sh.endTime,
                    total_required_workers: parseInt(sh.totalWorkers, 10),
                    skill_category: 'Valet Driver', // Fixed to Valet Driver as requested
                    notes: sh.notes ? `[${sh.name}] ${sh.notes}` : `[${sh.name}]`,
                    routes: validRoutes
                };

                await fetchApi('/requests/', {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
            }

            setSubmitStatus(`All ${shifts.length} shift request${shifts.length > 1 ? 's' : ''} dispatched successfully! Redirecting...`);
            setTimeout(() => {
                router.push('/operations/requests');
            }, 800);
        } catch (err: any) {
            setError(err.message || 'Failed to dispatch manpower request.');
            setSubmitting(false);
        }
    };

    const totalHeadcountAllShifts = shifts.reduce((acc, sh) => acc + (parseInt(sh.totalWorkers, 10) || 0), 0);

    if (loading) {
        return (
            <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#dbb457] mx-auto mb-3"></div>
                Loading manager locations & agency roster...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Dispatch Manpower Request</h1>
                    <p className="text-sm text-gray-500">
                        Select your assigned location, configure shifts, and dispatch to contracted agencies
                    </p>
                </div>
                <Link 
                    href="/operations/requests" 
                    className="text-sm text-gray-500 hover:text-gray-800 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    ← Back to Requests
                </Link>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-500 font-bold ml-2">✕</button>
                </div>
            )}

            {submitStatus && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-xl text-sm font-bold animate-pulse">
                    {submitStatus}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Target Location & Date */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">1. Target Location & Date</h2>
                        <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200">
                            {sites.length} Assigned Location{sites.length !== 1 ? 's' : ''} for {managerName || 'Manager'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                                Target Location *
                            </label>
                            {sites.length === 0 ? (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                                    No locations are currently mapped to your account. Contact Super Admin to assign locations.
                                </div>
                            ) : (
                                <select 
                                    value={siteId} 
                                    onChange={e => setSiteId(e.target.value)} 
                                    required
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                >
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.address ? `• ${s.address}` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <p className="text-[11px] text-gray-400 mt-1">
                                Only displaying locations under your operational management
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                                Required Date *
                            </label>
                            <input 
                                type="date" 
                                value={requiredDate} 
                                onChange={e => setRequiredDate(e.target.value)} 
                                required
                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                                Date when valet manpower is required on site
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Shifts Configuration Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                                2. Shift Windows & Allocations
                            </h2>
                            <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                                {shifts.length} Shift{shifts.length !== 1 ? 's' : ''} Configured
                            </span>
                        </div>
                    </div>

                    {/* Shifts Cards */}
                    {shifts.map((shift, sIdx) => {
                        const shiftTotalReq = parseInt(shift.totalWorkers, 10) || 0;
                        const shiftRoutedSum = shift.routes.reduce((acc, r) => acc + (parseInt(r.requested_quantity, 10) || 0), 0);
                        const isOverAllocated = shiftRoutedSum > shiftTotalReq;

                        return (
                            <div 
                                key={shift.id} 
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                            >
                                {/* Shift Card Header */}
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                                            {sIdx + 1}
                                        </span>
                                        <input 
                                            type="text"
                                            value={shift.name}
                                            onChange={e => updateShift(sIdx, 'name', e.target.value)}
                                            className="font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#dbb457] focus:outline-none text-sm px-1 py-0.5"
                                            placeholder={`Shift ${sIdx + 1}`}
                                        />
                                    </div>

                                    {/* Quick Shift Presets */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0">
                                        <span className="text-[11px] text-gray-400 font-semibold mr-1 hidden sm:inline">Presets:</span>
                                        {PRESET_SHIFTS.map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => applyTimingPreset(sIdx, preset)}
                                                className="text-[11px] font-medium bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-800 border border-gray-200 px-2 py-0.5 rounded transition-colors"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}

                                        {/* Remove Shift Button (only if > 1) */}
                                        {shifts.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeShift(sIdx)}
                                                className="text-red-500 hover:text-red-700 font-bold text-xs ml-auto sm:ml-2 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                                title="Remove this shift"
                                            >
                                                ✕ Delete Shift
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Shift Form Body */}
                                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                                    {/* Clean Timings & Headcount Row (without inside button) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                                                Start Time *
                                            </label>
                                            <input 
                                                type="time" 
                                                value={shift.startTime} 
                                                onChange={e => updateShift(sIdx, 'startTime', e.target.value)} 
                                                required
                                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                                                End Time *
                                            </label>
                                            <input 
                                                type="time" 
                                                value={shift.endTime} 
                                                onChange={e => updateShift(sIdx, 'endTime', e.target.value)} 
                                                required
                                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                                                Workers Needed *
                                            </label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={shift.totalWorkers} 
                                                onChange={e => updateShift(sIdx, 'totalWorkers', e.target.value)} 
                                                required
                                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Skill Category (Fixed to Valet Driver) and Notes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                                                Skill Category
                                            </label>
                                            <input 
                                                type="text" 
                                                value="Valet Driver" 
                                                readOnly 
                                                disabled
                                                className="w-full border border-gray-200 bg-gray-100 text-gray-800 p-2.5 rounded-lg text-sm font-bold cursor-not-allowed select-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                                                Shift Notes / Instructions
                                            </label>
                                            <input 
                                                type="text" 
                                                value={shift.notes} 
                                                onChange={e => updateShift(sIdx, 'notes', e.target.value)}
                                                placeholder="e.g. Formal black suit, report to Main Gate"
                                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Agency Routing Allocation for this shift */}
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold uppercase text-gray-700">
                                                    Dispatch to Agencies for {shift.name} *
                                                </label>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                    isOverAllocated 
                                                        ? 'bg-red-100 text-red-700' 
                                                        : shiftRoutedSum === shiftTotalReq 
                                                            ? 'bg-green-100 text-green-700' 
                                                            : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    Routed: {shiftRoutedSum} / {shiftTotalReq} Drivers
                                                </span>
                                            </div>

                                            <button 
                                                type="button" 
                                                onClick={() => addRoute(sIdx)}
                                                className="text-xs font-bold text-[#dbb457] hover:text-[#c29d45] hover:underline flex items-center gap-1"
                                            >
                                                <span>+</span> Add Another Agency
                                            </button>
                                        </div>

                                        <div className="space-y-2.5">
                                            {shift.routes.map((rt, rIdx) => (
                                                <div 
                                                    key={rIdx} 
                                                    className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200"
                                                >
                                                    <div className="flex-1">
                                                        <select 
                                                            value={rt.supplier_id} 
                                                            onChange={e => updateRoute(sIdx, rIdx, 'supplier_id', e.target.value)}
                                                            required
                                                            className="w-full border border-gray-300 p-2 rounded text-sm bg-white font-medium focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                                        >
                                                            <option value="">Select Supplier Agency</option>
                                                            {/* Display only the agency name without (QAR .../hr) as requested */}
                                                            {suppliers.map(s => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="w-36">
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            value={rt.requested_quantity} 
                                                            onChange={e => updateRoute(sIdx, rIdx, 'requested_quantity', e.target.value)}
                                                            placeholder="Qty"
                                                            required
                                                            className="w-full border border-gray-300 p-2 rounded text-sm font-bold text-center focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                                        />
                                                    </div>

                                                    {shift.routes.length > 1 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeRoute(sIdx, rIdx)} 
                                                            className="text-red-500 hover:text-red-700 p-1.5 text-xs font-bold rounded hover:bg-red-50 transition-colors"
                                                            title="Remove Agency"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* ONLY ONE '+ Add Another Shift' button, OUTSIDE at the bottom of the shift cards as requested */}
                    <button 
                        type="button" 
                        onClick={addShift}
                        className="w-full py-3.5 bg-amber-50/70 hover:bg-amber-100/80 border-2 border-dashed border-[#dbb457] text-[#8c6b1c] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                        <span className="text-lg leading-none font-black">+</span>
                        <span>Add Another Shift</span>
                    </button>
                </div>

                {/* Bottom Summary Bar & Submit */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6 text-sm text-gray-700">
                        <div>
                            <span className="text-gray-400 text-xs block uppercase font-bold">Total Shifts</span>
                            <span className="font-black text-gray-900 text-lg">{shifts.length}</span>
                        </div>
                        <div className="h-8 border-l border-gray-200"></div>
                        <div>
                            <span className="text-gray-400 text-xs block uppercase font-bold">Total Manpower</span>
                            <span className="font-black text-gray-900 text-lg">{totalHeadcountAllShifts} Drivers</span>
                        </div>
                        <div className="h-8 border-l border-gray-200"></div>
                        <div>
                            <span className="text-gray-400 text-xs block uppercase font-bold">Location</span>
                            <span className="font-bold text-gray-800 text-sm">
                                {sites.find(s => s.id.toString() === siteId)?.name || 'Selected Location'}
                            </span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={submitting || sites.length === 0} 
                        className="w-full sm:w-auto bg-[#dbb457] hover:bg-[#c29d45] text-white px-8 py-3 rounded-lg font-bold text-sm shadow transition-all disabled:opacity-50 min-w-[220px]"
                    >
                        {submitting ? 'Dispatching Shifts...' : `Dispatch ${shifts.length} Shift${shifts.length > 1 ? 's' : ''} to Suppliers`}
                    </button>
                </div>
            </form>
        </div>
    );
}
