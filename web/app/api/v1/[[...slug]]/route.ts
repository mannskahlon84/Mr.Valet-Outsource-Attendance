import { NextRequest, NextResponse } from 'next/server';

// 82 Qatar Sites Data
const QATAR_SITES = [
    { name: "121 Tower", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "21 High Street Hotel", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "35 West Bay Tower", manager: "Maen Klaib", mgrId: 103 },
    { name: "Adrenaline Gym", manager: "Maen Klaib", mgrId: 103 },
    { name: "Al Ahli Hospital", manager: "Maen Klaib", mgrId: 103 },
    { name: "Al Maha Island", manager: "Brahim Hayouni", mgrId: 104 },
    { name: "Al Najada Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "Al-Aziziya Hotel", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Al-Rayyan Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "Andaz Doha Hotel", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Banana Island", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Banyan Tree Hotel", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Beiruti Restaurant", manager: "Maen Klaib", mgrId: 103 },
    { name: "Belhamber Restaurant", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "CAC TUS - Lusail", manager: "Maen Klaib", mgrId: 103 },
    { name: "Centro Mall", manager: "Brahim Hayouni", mgrId: 104 },
    { name: "Century Marina Mall", manager: "Maen Klaib", mgrId: 103 },
    { name: "Cielo Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "City Center", manager: "Maen Klaib", mgrId: 103 },
    { name: "Dar Global", manager: "Maen Klaib", mgrId: 103 },
    { name: "Doha Clinic", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Doha Festival City", manager: "Maen Klaib", mgrId: 103 },
    { name: "Doha oasis", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Dusit Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "Embassy Suites by Hilton", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Ezdan Palace", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Fairmont Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "Gewan Island", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Hilton the pearl residence", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Ibis and Adagio", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Intercontinental Doha", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Katara hills", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Katara Village", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Kempinski residence and suites", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Korean Medical Center", manager: "Maen Klaib", mgrId: 103 },
    { name: "La Cigale Hotel", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Laffan Tower", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Lagoona Mall", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Little Sailor Restaurant", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "M Gallery hotel", manager: "Ghazi Alshammari", mgrId: 105 },
    { name: "Medina Central", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Mall Of Qatar", manager: "Maen Klaib", mgrId: 103 },
    { name: "Manarat Lusail Tower", manager: "Maen Klaib", mgrId: 103 },
    { name: "Mandarin Oriental Doha", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Marsa Malaz Kempinski", manager: "Maen Klaib", mgrId: 103 },
    { name: "Maysan LXR", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Messila Resort", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Millennium Hotel and resort - em sherif", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Ministry Of Foreign Affairs (MOFA)", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Msheireb Downtown", manager: "Ghazi Alshammari", mgrId: 105 },
    { name: "Novo Cinema", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Old Doha Port", manager: "Brahim Hayouni", mgrId: 104 },
    { name: "Ooredoo", manager: "Maen Klaib", mgrId: 103 },
    { name: "Orient Pearl", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Park Hyatt Doha", manager: "Ghazi Alshammari", mgrId: 105 },
    { name: "Porto Arabia - UDC", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Pullman Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "QQ", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Raffles Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "Ritz Carlton hotel", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Rixos Qetaifan", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Rosewood Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "Sharq Village", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "Shoumoukh Tower", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "St Regis Doha", manager: "Maen Klaib", mgrId: 103 },
    { name: "St regis Marsa Arabia", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Surgi Art Hospital", manager: "Brahim Hayouni", mgrId: 104 },
    { name: "Tawar Mall", manager: "Maen Klaib", mgrId: 103 },
    { name: "The chedi katara Hotel", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "The Ned Doha", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "The Pearl Hospital", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "The Plaza by Anantara", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "The torch Hotel", manager: "Wissem Chagtmi", mgrId: 101 },
    { name: "The View Hospital", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Tower 18", manager: "Brahim Hayouni", mgrId: 104 },
    { name: "Twin Tower Lusail", manager: "Maen Klaib", mgrId: 103 },
    { name: "UDC Tower", manager: "Hani Abdelsallam", mgrId: 102 },
    { name: "Villaggio Mall", manager: "Maen Klaib", mgrId: 103 },
    { name: "Voco Hotel", manager: "Maen Klaib", mgrId: 103 },
    { name: "Waldorf Astoria", manager: "Maen Klaib", mgrId: 103 },
    { name: "West Walk", manager: "Maen Klaib", mgrId: 103 },
    { name: "Wyndham Hotel West Bay", manager: "Maen Klaib", mgrId: 103 }
];

const SITES_LIST = QATAR_SITES.map((s, idx) => ({
    id: idx + 1,
    name: s.name,
    address: "Doha, Qatar",
    latitude: 25.2854 + (idx * 0.0012),
    longitude: 51.5310 + (idx * 0.0011),
    geofence_radius_meters: 100.0,
    manager_id: s.mgrId,
    manager_name: s.manager,
    status: "active",
    qr_status: "ACTIVE",
    qr_token: `MC:LOC:${idx + 1}:token${idx + 1}`
}));

// Seed Users Map
const USERS_MAP: Record<string, any> = {
    "wissem.chagtmi@mrvalet.com": { id: 101, email: "wissem.chagtmi@mrvalet.com", name: "Wissem Chagtmi", role: "OPS_MANAGER", status: "active" },
    "hani.abdelsallam@mrvalet.com": { id: 102, email: "hani.abdelsallam@mrvalet.com", name: "Hani Abdelsallam", role: "OPS_MANAGER", status: "active" },
    "maen.klaib@mrvalet.com": { id: 103, email: "maen.klaib@mrvalet.com", name: "Maen Klaib", role: "OPS_MANAGER", status: "active" },
    "brahim.hayouni@mrvalet.com": { id: 104, email: "brahim.hayouni@mrvalet.com", name: "Brahim Hayouni", role: "OPS_MANAGER", status: "active" },
    "ghazi.alshammari@mrvalet.com": { id: 105, email: "ghazi.alshammari@mrvalet.com", name: "Ghazi Alshammari", role: "OPS_MANAGER", status: "active" },
    "ops@example.com": { id: 106, email: "ops@example.com", name: "Operations Manager", role: "OPS_MANAGER", status: "active" },
    "admin@example.com": { id: 1, email: "admin@example.com", name: "Super Admin", role: "SUPER_ADMIN", status: "active" },
    "manpreet@alsharqiholding.com": { id: 2, email: "manpreet@alsharqiholding.com", name: "Manpreet", role: "SUPER_ADMIN", status: "active" },
    "supplier@example.com": { id: 3, email: "supplier@example.com", name: "Demo Agency Head", role: "SUPPLIER_HEAD", supplier_id: 1, status: "active" },
    "accounting@example.com": { id: 4, email: "accounting@example.com", name: "Accounting Officer", role: "ACCOUNTING", status: "active" },
    "gm@example.com": { id: 5, email: "gm@example.com", name: "General Manager", role: "GENERAL_MANAGER", status: "active" },
    "worker@example.com": { id: 6, email: "worker@example.com", name: "Ali Hassan", role: "OUTSOURCE_WORKER", worker_id: 1, status: "active" }
};

// Seed Requests
let REQUESTS_DATA = [
    {
        id: 1,
        ops_manager_id: 103,
        ops_manager_name: "Maen Klaib",
        site_id: 27,
        site_name: "Fairmont Hotel",
        required_date: new Date().toISOString().split('T')[0],
        start_time: "08:00",
        end_time: "17:00",
        total_required_workers: 3,
        confirmed_workers: 3,
        skill_category: "Valet Driver",
        status: "CONFIRMED",
        created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: 2,
        ops_manager_id: 103,
        ops_manager_name: "Maen Klaib",
        site_id: 19,
        site_name: "City Center",
        required_date: new Date().toISOString().split('T')[0],
        start_time: "14:00",
        end_time: "23:00",
        total_required_workers: 2,
        confirmed_workers: 0,
        skill_category: "Valet Driver",
        status: "OPEN",
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 3,
        ops_manager_id: 101,
        ops_manager_name: "Wissem Chagtmi",
        site_id: 11,
        site_name: "Banana Island",
        required_date: new Date().toISOString().split('T')[0],
        start_time: "09:00",
        end_time: "18:00",
        total_required_workers: 4,
        confirmed_workers: 4,
        skill_category: "Valet Driver",
        status: "CONFIRMED",
        created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 4,
        ops_manager_id: 102,
        ops_manager_name: "Hani Abdelsallam",
        site_id: 31,
        site_name: "Intercontinental Doha",
        required_date: new Date().toISOString().split('T')[0],
        start_time: "12:00",
        end_time: "21:00",
        total_required_workers: 2,
        confirmed_workers: 0,
        skill_category: "Valet Driver",
        status: "OPEN",
        created_at: new Date(Date.now() - 14400000).toISOString()
    },
    {
        id: 5,
        ops_manager_id: 103,
        ops_manager_name: "Maen Klaib",
        site_id: 62,
        site_name: "Rosewood Hotel",
        required_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        start_time: "16:00",
        end_time: "01:00",
        total_required_workers: 3,
        confirmed_workers: 0,
        skill_category: "Valet Driver",
        status: "OPEN",
        created_at: new Date(Date.now() - 1800000).toISOString()
    }
];

// Seed Workers
let WORKERS_DATA = [
    { id: 1, internal_worker_id: "WRK-001", first_name: "Ali", last_name: "Hassan", qid: "29501234567", whatsapp_number: "+97466001122", supplier_id: 1, status: "active", skill_category: "Valet Driver" },
    { id: 2, internal_worker_id: "WRK-002", first_name: "Tariq", last_name: "Mahmood", qid: "29309876543", whatsapp_number: "+97466003344", supplier_id: 1, status: "active", skill_category: "Valet Driver" },
    { id: 3, internal_worker_id: "WRK-003", first_name: "Bilal", last_name: "Ahmed", qid: "29105432198", whatsapp_number: "+97466005566", supplier_id: 1, status: "active", skill_category: "Valet Driver" },
    { id: 4, internal_worker_id: "WRK-004", first_name: "Mohammad", last_name: "Farhan", qid: "29408765432", whatsapp_number: "+97455007788", supplier_id: 1, status: "active", skill_category: "Valet Supervisor" },
    { id: 5, internal_worker_id: "WRK-005", first_name: "Rashid", last_name: "Khan", qid: "29207654321", whatsapp_number: "+97455009900", supplier_id: 1, status: "active", skill_category: "Valet Driver" }
];

// Notifications
let NOTIFICATIONS_DATA = [
    {
        id: 1,
        title: "New Shift Dispatched",
        message: "Fairmont Hotel valet shift request (3 staff) has been dispatched.",
        type: "SHIFT_DISPATCH",
        is_read: false,
        created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: 2,
        title: "Supplier Confirmed",
        message: "Demo Agency confirmed 3 workers for Fairmont Hotel shift.",
        type: "SUPPLIER_CONFIRMATION",
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 3,
        title: "Worker Check-In",
        message: "Ali Hassan (WRK-001) checked in on-site at Fairmont Hotel.",
        type: "ATTENDANCE",
        is_read: true,
        created_at: new Date(Date.now() - 1800000).toISOString()
    }
];

// Invoices
const INVOICES_DATA = [
    {
        id: 1,
        invoice_number: "INV-2026-001",
        supplier_id: 1,
        supplier_name: "Demo Agency",
        billing_period: "August 2026",
        total_hours: 360,
        hourly_rate: 45.0,
        total_amount: 16200.0,
        status: "APPROVED",
        created_at: "2026-09-01T00:00:00Z"
    },
    {
        id: 2,
        invoice_number: "INV-2026-002",
        supplier_id: 1,
        supplier_name: "Demo Agency",
        billing_period: "September 2026",
        total_hours: 180,
        hourly_rate: 45.0,
        total_amount: 8100.0,
        status: "PENDING_OPS_APPROVAL",
        created_at: "2026-09-08T00:00:00Z"
    }
];

// Helper to extract user from Authorization header
function getUserFromAuth(req: NextRequest) {
    const auth = req.headers.get('authorization') || '';
    if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        if (token.startsWith('token_')) {
            try {
                const jsonStr = Buffer.from(token.slice(6), 'base64').toString('utf-8');
                return JSON.parse(jsonStr);
            } catch (e) {}
        }
    }
    // Default demo user: Maen Klaib
    return USERS_MAP["maen.klaib@mrvalet.com"];
}

// Generate token
function makeToken(user: any) {
    const base64 = Buffer.from(JSON.stringify(user)).toString('base64');
    return `token_${base64}`;
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    const { slug = [] } = await context.params;
    const path = slug.join('/');
    const user = getUserFromAuth(req);

    // Auth Me
    if (path === 'auth/me') {
        return NextResponse.json(user);
    }

    // Sites
    if (path === 'sites' || path === 'sites/') {
        return NextResponse.json(SITES_LIST);
    }

    // Shift Requests
    if (path === 'requests' || path === 'requests/' || path === 'requests/supplier') {
        // If supplier, return requests dispatched
        if (path === 'requests/supplier' || user.role === 'SUPPLIER_HEAD') {
            return NextResponse.json(REQUESTS_DATA);
        }
        // If operations manager, show his sites or all
        if (user.role === 'OPS_MANAGER') {
            const filtered = REQUESTS_DATA.filter(r => r.ops_manager_id === user.id);
            return NextResponse.json(filtered.length > 0 ? filtered : REQUESTS_DATA);
        }
        return NextResponse.json(REQUESTS_DATA);
    }

    // Specific Request
    if (path.startsWith('requests/') && !path.includes('messages') && !path.includes('supplier')) {
        const reqId = parseInt(path.split('/')[1]);
        const found = REQUESTS_DATA.find(r => r.id === reqId) || REQUESTS_DATA[0];
        return NextResponse.json({
            ...found,
            site: SITES_LIST.find(s => s.id === found.site_id) || SITES_LIST[0],
            responses: [
                {
                    id: 1,
                    manpower_request_id: found.id,
                    supplier_id: 1,
                    supplier_name: "Demo Agency",
                    requested_quantity: found.total_required_workers,
                    confirmed_quantity: found.confirmed_workers,
                    status: found.status === 'CONFIRMED' ? 'ACCEPTED_BY_OM' : 'PENDING'
                }
            ]
        });
    }

    // Request Messages
    if (path.includes('requests/') && path.endsWith('/messages')) {
        return NextResponse.json([
            { id: 1, sender: "Operations", message: "Urgent shift requirement for Fairmont Hotel valet entrance.", created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 2, sender: "Supplier", message: "Confirmed. We have assigned 3 licensed valet drivers with valid QIDs.", created_at: new Date(Date.now() - 1800000).toISOString() }
        ]);
    }

    // Supplier responses
    if (path === 'requests/supplier-responses') {
        return NextResponse.json([
            { id: 1, manpower_request_id: 1, supplier_id: 1, requested_quantity: 3, confirmed_quantity: 3, status: 'ACCEPTED_BY_OM' }
        ]);
    }

    // Allocations
    if (path === 'allocations' || path === 'allocations/') {
        return NextResponse.json([
            { id: 1, supplier_response_id: 1, worker_id: 1, worker_name: "Ali Hassan", status: "ASSIGNED" },
            { id: 2, supplier_response_id: 1, worker_id: 2, worker_name: "Tariq Mahmood", status: "ASSIGNED" },
            { id: 3, supplier_response_id: 1, worker_id: 3, worker_name: "Bilal Ahmed", status: "ASSIGNED" }
        ]);
    }

    // Workers
    if (path === 'workers' || path === 'workers/') {
        return NextResponse.json(WORKERS_DATA);
    }

    if (path === 'workers/next-id') {
        return NextResponse.json({ next_worker_id: `WRK-00${WORKERS_DATA.length + 1}` });
    }

    // Suppliers
    if (path === 'suppliers' || path === 'suppliers/') {
        return NextResponse.json([
            { id: 1, name: "Demo Agency", contact_person: "John Doe", contact_email: "agency@example.com", contact_phone: "+974 5512 3456", billing_rate: 45.0, status: "active" },
            { id: 2, name: "Qatar Star Manpower", contact_person: "Ahmed Al-Kuwari", contact_email: "contact@qatarstar.qa", contact_phone: "+974 4433 2211", billing_rate: 45.0, status: "active" }
        ]);
    }

    // Worker Today Assignment
    if (path === 'assignments/today') {
        return NextResponse.json({
            assignment_id: 1,
            worker_id: 1,
            worker_name: "Ali Hassan",
            internal_worker_id: "WRK-001",
            attendance_status: "NOT_CHECKED_IN",
            site_id: null,
            site_name: null,
            site_address: null,
            start_time: null,
            end_time: null,
            check_in_time: null,
            check_out_time: null
        });
    }

    // Notifications
    if (path === 'notifications' || path === 'notifications/') {
        return NextResponse.json(NOTIFICATIONS_DATA);
    }

    // Accounting
    if (path === 'accounting/invoices') {
        return NextResponse.json(INVOICES_DATA);
    }

    if (path === 'accounting/summary') {
        return NextResponse.json({
            total_billing: 24300.0,
            total_hours: 540,
            pending_invoices: 1,
            approved_invoices: 1
        });
    }

    if (path === 'accounting/rates') {
        return NextResponse.json([
            { skill_category: "Valet Driver", standard_rate: 45.0, overtime_rate: 55.0, currency: "QAR" },
            { skill_category: "Valet Supervisor", standard_rate: 60.0, overtime_rate: 75.0, currency: "QAR" }
        ]);
    }

    if (path === 'accounting/audit') {
        return NextResponse.json({
            audit_records: [
                { date: "2026-09-08", worker: "Ali Hassan", site: "Fairmont Hotel", hours_logged: 9.0, billing_hours: 9.0, discrepancy: 0 },
                { date: "2026-09-08", worker: "Tariq Mahmood", site: "Banana Island", hours_logged: 9.0, billing_hours: 9.0, discrepancy: 0 }
            ]
        });
    }

    // Reports Attendance
    if (path === 'reports/attendance') {
        return NextResponse.json({
            summary: {
                total_duty_hours: 540,
                total_present_days: 60,
                total_workers: 5,
                completion_rate: "98.5%"
            },
            records: [
                { id: 1, worker_name: "Ali Hassan", internal_worker_id: "WRK-001", site_name: "Fairmont Hotel", date: new Date().toISOString().split('T')[0], check_in: "07:55", check_out: "17:02", hours_worked: 9.1, status: "PRESENT" },
                { id: 2, worker_name: "Tariq Mahmood", internal_worker_id: "WRK-002", site_name: "Banana Island", date: new Date().toISOString().split('T')[0], check_in: "08:50", check_out: "18:05", hours_worked: 9.2, status: "PRESENT" },
                { id: 3, worker_name: "Bilal Ahmed", internal_worker_id: "WRK-003", site_name: "City Center", date: new Date().toISOString().split('T')[0], check_in: "13:55", check_out: "23:00", hours_worked: 9.0, status: "PRESENT" }
            ]
        });
    }

    if (path === 'reports/attendance/export/excel' || path === 'reports/attendance/export/pdf') {
        const csv = "Worker,Worker ID,Site,Date,Check In,Check Out,Hours,Status\n" +
            "Ali Hassan,WRK-001,Fairmont Hotel,2026-09-09,07:55,17:02,9.1,PRESENT\n" +
            "Tariq Mahmood,WRK-002,Banana Island,2026-09-09,08:50,18:05,9.2,PRESENT\n";
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="attendance_report.csv"'
            }
        });
    }

    if (path.includes('accounting/invoices/') && (path.endsWith('/download') || path.endsWith('/pdf'))) {
        const csv = "Invoice Number,INV-2026-001\nSupplier,Demo Agency\nBilling Period,August 2026\nTotal Hours,360\nHourly Rate,QAR 45\nTotal Amount,QAR 16200\nStatus,APPROVED\n";
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="invoice.csv"'
            }
        });
    }

    return NextResponse.json({ status: "ok", path, message: "Manpower Control System API Active" });
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    const { slug = [] } = await context.params;
    const path = slug.join('/');

    // Auth Login
    if (path === 'auth/login') {
        let username = '';
        let password = '';

        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await req.text();
            const params = new URLSearchParams(text);
            username = params.get('username') || '';
            password = params.get('password') || '';
        } else if (contentType.includes('application/json')) {
            const body = await req.json();
            username = body.username || body.email || '';
            password = body.password || '';
        } else {
            const formData = await req.formData();
            username = (formData.get('username') as string) || '';
            password = (formData.get('password') as string) || '';
        }

        const cleanUser = username.trim().toLowerCase();
        let matchedUser = USERS_MAP[cleanUser];

        if (!matchedUser) {
            // Find by prefix or name
            const key = Object.keys(USERS_MAP).find(k => k.includes(cleanUser) || cleanUser.includes(k.split('@')[0]));
            if (key) {
                matchedUser = USERS_MAP[key];
            } else {
                // Auto-create demo session for user
                let role = "OPS_MANAGER";
                if (cleanUser.includes('admin')) role = "SUPER_ADMIN";
                else if (cleanUser.includes('supplier')) role = "SUPPLIER_HEAD";
                else if (cleanUser.includes('accounting')) role = "ACCOUNTING";
                else if (cleanUser.includes('gm')) role = "GENERAL_MANAGER";
                else if (cleanUser.includes('worker')) role = "OUTSOURCE_WORKER";

                matchedUser = {
                    id: Math.floor(Math.random() * 900) + 100,
                    email: username,
                    name: username.split('@')[0].replace('.', ' ').toUpperCase(),
                    role: role,
                    status: "active"
                };
            }
        }

        const token = makeToken(matchedUser);
        return NextResponse.json({
            access_token: token,
            token_type: "bearer",
            user: matchedUser
        });
    }

    if (path === 'auth/forgot-password') {
        return NextResponse.json({ message: "Password reset link sent to your email" });
    }

    if (path === 'auth/reset-password') {
        return NextResponse.json({ message: "Password updated successfully" });
    }

    // Create Shift Request
    if (path === 'requests' || path === 'requests/') {
        let body: any = {};
        try { body = await req.json(); } catch (e) {}
        const newReq = {
            id: REQUESTS_DATA.length + 1,
            ops_manager_id: body.ops_manager_id || 103,
            ops_manager_name: "Maen Klaib",
            site_id: body.site_id || 27,
            site_name: SITES_LIST.find(s => s.id === body.site_id)?.name || "Fairmont Hotel",
            required_date: body.required_date || new Date().toISOString().split('T')[0],
            start_time: body.start_time || "08:00",
            end_time: body.end_time || "17:00",
            total_required_workers: body.total_required_workers || 2,
            confirmed_workers: 0,
            skill_category: body.skill_category || "Valet Driver",
            status: "OPEN",
            created_at: new Date().toISOString()
        };
        REQUESTS_DATA.unshift(newReq);
        return NextResponse.json(newReq);
    }

    // Add Worker
    if (path === 'workers' || path === 'workers/') {
        let body: any = {};
        try { body = await req.json(); } catch (e) {}
        const newWorker = {
            id: WORKERS_DATA.length + 1,
            internal_worker_id: body.internal_worker_id || `WRK-00${WORKERS_DATA.length + 1}`,
            first_name: body.first_name || "New",
            last_name: body.last_name || "Worker",
            qid: body.qid || "29500000000",
            whatsapp_number: body.whatsapp_number || "+97400000000",
            supplier_id: body.supplier_id || 1,
            status: "active",
            skill_category: body.skill_category || "Valet Driver"
        };
        WORKERS_DATA.push(newWorker);
        return NextResponse.json(newWorker);
    }

    // Attendance Check-In
    if (path === 'attendance/check-in') {
        let body: any = {};
        try { body = await req.json(); } catch (e) {}
        
        let matchedSite = SITES_LIST.find(s => s.name === "Fairmont Hotel") || SITES_LIST[0];
        if (body.qr_data) {
            const qr = String(body.qr_data).trim();
            const found = SITES_LIST.find(s => s.qr_token === qr || qr.includes(`:LOC:${s.id}`) || qr.toLowerCase().includes(s.name.toLowerCase()));
            if (found) matchedSite = found;
        }
        if (body.site_id) {
            const found = SITES_LIST.find(s => s.id === Number(body.site_id));
            if (found) matchedSite = found;
        }

        const now = new Date();
        return NextResponse.json({
            success: true,
            message: `Checked in successfully at ${matchedSite.name}`,
            site_id: matchedSite.id,
            site_name: matchedSite.name,
            site_address: matchedSite.address,
            latitude: matchedSite.latitude,
            longitude: matchedSite.longitude,
            geofence_radius: matchedSite.geofence_radius_meters,
            check_in_time: now.toISOString(),
            status: "CHECKED_IN"
        });
    }

    // Attendance Check-Out
    if (path === 'attendance/check-out') {
        let body: any = {};
        try { body = await req.json(); } catch (e) {}
        const now = new Date();
        return NextResponse.json({
            success: true,
            message: "Shift clocked out successfully! Duty hours logged into the system.",
            check_out_time: now.toISOString(),
            total_hours: 9.0,
            status: "CHECKED_OUT"
        });
    }

    // Attendance Exceptions
    if (path === 'attendance/exceptions') {
        return NextResponse.json({
            success: true,
            message: "Incident reported to Operations Manager"
        });
    }

    // Respond to Request
    if (path.includes('requests/') && path.endsWith('/respond')) {
        return NextResponse.json({
            id: 1,
            manpower_request_id: 1,
            supplier_id: 1,
            confirmed_quantity: 3,
            status: "ACCEPTED_BY_OM"
        });
    }

    // Send Message
    if (path.includes('requests/') && path.endsWith('/messages')) {
        let body: any = {};
        try { body = await req.json(); } catch (e) {}
        return NextResponse.json({
            id: Date.now(),
            sender: "User",
            message: body.message || "Message received",
            created_at: new Date().toISOString()
        });
    }

    // Finalize Response
    if (path.includes('/finalize')) {
        return NextResponse.json({
            success: true,
            message: "Supplier response finalized"
        });
    }

    // Allocate Workers
    if (path.includes('/allocate-workers')) {
        return NextResponse.json({
            success: true,
            message: "Workers assigned successfully"
        });
    }

    // Mark all notifications read
    if (path === 'notifications/mark-all-read') {
        NOTIFICATIONS_DATA = NOTIFICATIONS_DATA.map(n => ({ ...n, is_read: true }));
        return NextResponse.json({ success: true, count: NOTIFICATIONS_DATA.length });
    }

    // Test Push Notification
    if (path === 'notifications/test-push') {
        const testPush = {
            id: Date.now(),
            title: "🚨 Urgent Shift Dispatch",
            message: "Fairmont Hotel requires 3 additional Valet Drivers immediately.",
            type: "TEST_PUSH",
            is_read: false,
            created_at: new Date().toISOString()
        };
        NOTIFICATIONS_DATA.unshift(testPush);
        return NextResponse.json({
            success: true,
            notification: testPush
        });
    }

    return NextResponse.json({ success: true });
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    const { slug = [] } = await context.params;
    const path = slug.join('/');

    if (path.startsWith('notifications/') && path.endsWith('/read')) {
        const id = parseInt(path.split('/')[1]);
        const n = NOTIFICATIONS_DATA.find(item => item.id === id);
        if (n) n.is_read = true;
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    return NextResponse.json({ success: true });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    return NextResponse.json({ success: true });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}
