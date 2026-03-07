const http = require('http');

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

const data = JSON.stringify(booking);

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/bookings',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
