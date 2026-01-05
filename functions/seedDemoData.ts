import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // 1. Create Customers
        const customersData = [
            {
                name: "אברהם לוי",
                customer_type: "individual",
                contact_person: "אברהם",
                phone: "050-1234567",
                email: "avi@gmail.com",
                address: "רחוב הרצל 1, תל אביב",
                city: "תל אביב",
                status: "active",
                sla_response_minutes: 60,
                sla_arrival_minutes: 90
            },
            {
                name: "ביטוח ישיר",
                customer_type: "insurance_company",
                contact_person: "שרה כהן",
                phone: "03-9876543",
                email: "sarah@direct.co.il",
                address: "הברזל 10, תל אביב",
                city: "תל אביב",
                status: "active",
                sla_response_minutes: 30,
                sla_arrival_minutes: 60
            },
            {
                name: "צי רכב הצפון",
                customer_type: "fleet",
                contact_person: "יוסי צפון",
                phone: "04-1234567",
                email: "yossi@northfleet.co.il",
                address: "הנשיא 5, חיפה",
                city: "חיפה",
                status: "active",
                sla_response_minutes: 45,
                sla_arrival_minutes: 120
            },
            {
                name: "מוסך המרכז",
                customer_type: "garage",
                contact_person: "דוד מוסך",
                phone: "03-1112222",
                email: "david@garage.co.il",
                address: "הפטיש 3, חולון",
                city: "חולון",
                status: "active",
                sla_response_minutes: 60,
                sla_arrival_minutes: 90
            },
            {
                name: "ישראל ישראלי",
                customer_type: "individual",
                contact_person: "ישראל",
                phone: "052-5555555",
                email: "israel@gmail.com",
                address: "בן גוריון 10, ירושלים",
                city: "ירושלים",
                status: "active",
                sla_response_minutes: 60,
                sla_arrival_minutes: 90
            }
        ];
        
        const createdCustomers = await base44.entities.Customer.bulkCreate(customersData);
        
        // Fetch existing providers to potentially assign
        const existingProviders = await base44.entities.ServiceProvider.list();

        // 2. Create Cases
        const serviceTypes = ["towing", "flat_tire", "battery", "lockout", "fuel"];
        const statuses = ["new", "assigned", "in_progress", "completed", "cancelled"];
        const vehicleTypes = ["car", "motorcycle", "truck"];
        
        const casesData = [];
        
        for (let i = 0; i < 20; i++) {
            const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
            const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
            
            let assignedProviderId = null;
            let assignedProviderName = null;
            let assignedAt = null;

            if (status !== 'new' && existingProviders.length > 0) {
                 const provider = existingProviders[Math.floor(Math.random() * existingProviders.length)];
                 assignedProviderId = provider.id;
                 assignedProviderName = provider.name;
                 assignedAt = new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString();
            }

            casesData.push({
                case_number: `DEMO-${1000 + i}`,
                customer_id: customer.id,
                customer_name: customer.name,
                caller_name: customer.contact_person,
                caller_phone: customer.phone,
                vehicle_number: `${Math.floor(Math.random() * 9000000) + 1000000}`,
                vehicle_type: vehicleType,
                vehicle_model: "רכב דמו",
                service_type: serviceType,
                location_address: customer.address,
                location_city: customer.city,
                status: status,
                priority: Math.random() > 0.8 ? "urgent" : "normal",
                problem_description: "תקלה כללית ברכב, דרוש סיוע",
                created_date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
                assigned_provider_id: assignedProviderId,
                assigned_provider_name: assignedProviderName,
                assigned_at: assignedAt
            });
        }
        
        await base44.entities.Case.bulkCreate(casesData);
        
        // 3. Create Interactions
        const interactionsData = [];
        for (let i = 0; i < 15; i++) {
             const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
             interactionsData.push({
                 customer_id: customer.id,
                 type: "call",
                 direction: Math.random() > 0.5 ? "inbound" : "outbound",
                 summary: "שיחת דמו",
                 details: "תיעוד שיחה שנוצר באופן אוטומטי לצורך הדגמה",
                 performed_by: user ? user.full_name : "מערכת",
                 interaction_date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString()
             });
        }
        await base44.entities.CustomerInteraction.bulkCreate(interactionsData);

        return Response.json({ success: true, message: `Created ${createdCustomers.length} customers, ${casesData.length} cases, ${interactionsData.length} interactions` });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});