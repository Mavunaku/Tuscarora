const fetch = require('node-fetch');

const booking = {
    member: 'Markley',
    building: 'Lazy Lodge',
    roomId: 'll1',
    roomName: 'Lazy Lodge #1',
    startDate: '2026-03-10',
    endDate: '2026-03-12',
    guests: 1,
    dailyMeals: {},
    memberArrival: '14:00',
    guestArrival: '14:00',
    isGuest: 'MEMBER',
    isGuestRoom: 'MEMBER',
    stayingInCottage: false,
    provisional: false
};

fetch('http://localhost:3001/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking)
})
    .then(res => {
        console.log('Status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('Response:', data);
    })
    .catch(err => {
        console.error('Error:', err);
    });
