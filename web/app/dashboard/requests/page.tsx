"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [sites, setSites] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [role, setRole] = useState('');

    // Form state
    const [requestsList, setRequestsList] = useState([{
        siteId: '', reqDate: '', startTime: '08:00', endTime: '17:00', totalWorkers: '10', notes: '', supplierId: ''
    }]);
                    
    const loadData = () => {
        fetchApi('/requests/').then(setRequests).finally(() => setLoading(false));
        fetchApi('/sites/').then(setSites).catch(() => {});
        fetchApi('/suppliers/').then(setSuppliers).catch(() => {});
    };

    useEffect(() => {
        setRole(localStorage.getItem('role') || '');
        loadData();
    }, []);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            for (const req of requestsList) {
                await fetchApi('/requests/', {
                    method: 'POST',
                    body: JSON.stringify({
                        site_id: parseInt(req.siteId),
                        required_date: req.reqDate,
                        start_time: req.startTime,
                        end_time: req.endTime,
                        total_required_workers: parseInt(req.totalWorkers),
                        notes: req.notes,
                        routes: [{supplier_id: parseInt(req.supplierId), requested_quantity: parseInt(req.totalWorkers)}]
                    })
                });
            }
            setShowModal(false);
            setRequestsList([{ siteId: '', reqDate: '', startTime: '08:00', endTime: '17:00', totalWorkers: '10', notes: '', supplierId: '' }]);
            setLoading(true);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };
    
    const updateReq = (index: number, field: keyof typeof requestsList[0], value: any) => {
        const newReqs = [...requestsList];
        newReqs[index][field] = value;
        setRequestsList(newReqs);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Manpower Requests</h1>
                {role !== "General Manager" && role !== "Supplier Head" && (
                    <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">+ Create Request</button>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create Manpower Request</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {requestsList.map((req, index) => (
                                <div key={index} className="p-4 border border-gray-200 rounded mb-4 bg-gray-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold">Request #{index + 1}</h3>
                                        {requestsList.length > 1 && (
                                            <button type="button" onClick={() => setRequestsList(requestsList.filter((_, i) => i !== index))} className="text-red-500 text-sm">Remove</button>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Location / Site</label>
                                            <select required value={req.siteId} onChange={e=>updateReq(index, 'siteId', e.target.value)} className="w-full border p-2 rounded mt-1">
                                                <option value="">Select Location</option>
                                                {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Required Date</label>
                                            <input type="date" required value={req.reqDate} onChange={e=>updateReq(index, 'reqDate', e.target.value)} className="w-full border p-2 rounded mt-1" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Shift Start</label>
                                                <input type="time" required value={req.startTime} onChange={e=>updateReq(index, 'startTime', e.target.value)} className="w-full border p-2 rounded mt-1" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Shift End</label>
                                                <input type="time" required value={req.endTime} onChange={e=>updateReq(index, 'endTime', e.target.value)} className="w-full border p-2 rounded mt-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Number of Workers Required</label>
                                            <input type="number" required min="1" value={req.totalWorkers} onChange={e=>updateReq(index, 'totalWorkers', e.target.value)} className="w-full border p-2 rounded mt-1" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Supplier</label>
                                            <select required value={req.supplierId} onChange={e=>updateReq(index, 'supplierId', e.target.value)} className="w-full border p-2 rounded mt-1">
                                                <option value="">Select Supplier</option>
                                                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                            <textarea value={req.notes} onChange={e=>updateReq(index, 'notes', e.target.value)} className="w-full border p-2 rounded mt-1" rows={2}></textarea>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="mb-4">
                                <button type="button" onClick={() => setRequestsList([...requestsList, { siteId: '', reqDate: '', startTime: '08:00', endTime: '17:00', totalWorkers: '10', notes: '', supplierId: '' }])} className="text-blue-600 hover:underline font-medium">+ Add Another Request</button>
                            </div>
                            <div className="flex justify-end space-x-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit Request(s)</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Req ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {requests.map((r: any) => (
                            <tr key={r.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">REQ-{r.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">Site #{r.site_id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(r.required_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{r.total_required_workers}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 text-xs font-semibold rounded-full ${r.status === "DRAFT" ? "bg-gray-100 text-gray-800" : r.status === "PUBLISHED" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No requests found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
