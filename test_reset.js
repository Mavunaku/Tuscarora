
async function testReset() {
    console.log('--- Requesting Reset ---');
    const reqRes = await fetch('http://localhost:3001/api/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin' })
    });
    const reqData = await reqRes.json();
    console.log('Request Status:', reqRes.status, reqData);

    if (reqRes.ok) {
        // Since we are running locally and the email might not actually be sent (or we can't check it easily here),
        // let's check the database directly for the token.
        const sqlite3 = require('sqlite3');
        const path = require('path');
        const dbPath = path.join(__dirname, 'reservations.db');
        const db = new sqlite3.Database(dbPath);

        db.get("SELECT reset_token FROM members WHERE login = 'admin'", async (err, row) => {
            if (err) {
                console.error(err);
                db.close();
                return;
            }
            const token = row.reset_token;
            console.log('Found Token:', token);

            console.log('--- resetting Password ---');
            const resetRes = await fetch('http://localhost:3001/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    username: 'admin',
                    newPassword: 'newpassword123'
                })
            });
            const resetData = await resetRes.json();
            console.log('Reset Status:', resetRes.status, resetData);

            // Verify login with new password
            console.log('--- Verifying Login with New Password ---');
            const loginRes = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'newpassword123'
                })
            });
            const loginData = await loginRes.json();
            console.log('Login Status:', loginRes.status, loginData);

            // Verify password_changed flag
            db.get("SELECT password_changed FROM members WHERE login = 'admin'", (err, row) => {
                console.log('Password Changed Flag:', row.password_changed);
                db.close();
            });
        });
    }
}

testReset();
