
async function checkGeneral() {
    try {
        const membersRes = await fetch('http://localhost:3001/api/members');
        const membersData = await membersRes.json();
        console.log('Members count:', membersData.length);

        const bookingsRes = await fetch('http://localhost:3001/api/bookings');
        const bookingsData = await bookingsRes.json();
        console.log('Bookings count:', bookingsData.length);

        const messagesRes = await fetch('http://localhost:3001/api/messages');
        const messagesData = await messagesRes.json();
        console.log('Messages count:', messagesData.length);
    } catch (e) {
        console.error(e);
    }
}

checkGeneral();
