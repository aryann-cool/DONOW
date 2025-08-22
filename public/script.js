// Import the required Firebase services.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Include Tone.js for sound effects.
import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";



// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBQ13SMnKS3-TzG1pC7RF_WlIuSx0bbl-k",
    authDomain: "himalayan-royals-rewards.firebaseapp.com",
    projectId: "himalayan-royals-rewards",
    storageBucket: "himalayan-royals-rewards.firebasestorage.app",
    messagingSenderId: "643140361069",
    appId: "1:643140361069:web:5ebcbfa715c478b0d35864",
    measurementId: "G-X7KYZNJC30"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const analytics = getAnalytics(app);

let userId = '';
let userEmail = '';
let xdBalance = 0;
let userReferralCode = '';
let referredBy = null;
let isSpinning = false;
let notifications = [];

// DOM Elements
const googleLoginBtn = document.getElementById('googleLoginBtn');
const referralInput = document.getElementById('referralInput');
const continueBtn = document.getElementById('continue-btn');
const skipBtn = document.getElementById('skip-btn');
const xdBalanceEl = document.getElementById('xd-balance');
const spinBtn = document.getElementById('spin-btn');
const watchAdBtn = document.getElementById('watch-ad-btn');
const wheelCanvas = document.getElementById('wheelCanvas');
const wheelContainer = document.getElementById('wheel-container');
const spinMessageEl = document.getElementById('spin-message');
const ctx = wheelCanvas ? wheelCanvas.getContext('2d') : null;
const withdrawSection = document.getElementById('withdraw-section');
const redeemAmountRbxInput = document.getElementById('redeem-amount-rbx');
const robloxUsernameInput = document.getElementById('roblox-username');
const withdrawForm = document.getElementById('withdraw-form');
const withdrawBtn = document.getElementById('withdraw-btn');
const xdDeductedAmountEl = document.getElementById('xd-deducted-amount');
const gamepassAmountEl = document.getElementById('gamepass-amount');

// --- Game Configuration ---
const MIN_WITHDRAW_RBX = 7;
const RBX_TO_XD_RATE = 100;
const GAMEPASS_DEDUCTION_RATE = 0.30;
const REFERRAL_BONUS_RATE = 0.10;
const segments = [
    { text: '2 XD', value: 2, chance: 37, color: '#2C3E50' },
    { text: '4 XD', value: 4, chance: 30, color: '#34495E' },
    { text: '10 XD', value: 10, chance: 10, color: '#F39C12' },
    { text: '20 XD', value: 20, chance: 5, color: '#F1C40F' },
    { text: '16 XD', value: 16, chance: 15, color: '#3498DB' },
    { text: '50 XD', value: 50, chance: 2, color: '#E74C3C' },
    { text: '100 XD', value: 100, chance: 1, color: '#9B59B6' },
    { text: 'Jackpot', value: 100000, chance: 0, color: '#FFD700' },
];

const totalChance = segments.reduce((sum, seg) => sum + seg.chance, 0);
const spinCost = 999;

// Function to generate a random referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// --- Firebase Functions ---
async function fetchUserData(id) {
    const userDocRef = doc(db, 'users', id);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data() : null;
}

async function fetchUserByEmail(email) {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ? querySnapshot.docs[0].data() : null;
}

async function createNewUser(user, referralCode) {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        xd: 0,
        userReferralCode: generateReferralCode(),
        referredBy: referralCode || null,
        createdAt: serverTimestamp(),
    });
}

async function updateUserData(id, data) {
    const userDocRef = doc(db, 'users', id);
    await updateDoc(userDocRef, data);
}

// --- User Flow & Authentication ---
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        const loadingScreen = document.getElementById('loading');
        loadingScreen.classList.add('show');
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user already exists in Firestore by UID
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);

            localStorage.setItem('userUid', user.uid);

            if (docSnap.exists()) {
                // ✅ User exists, redirect to dashboard
                console.log("Existing user logged in:", docSnap.data());
                window.location.href = 'dashboard.html';
            } else {
                // 🆕 New user, redirect to referral page
                console.log("New user, redirecting to referral page.");
                window.location.href = 'referal.html';
            }

        } catch (error) {
            console.error("Google login failed:", error);
            alert(`Google login failed: ${error.message}`);
        } finally {
            loadingScreen.classList.remove('show');
        }
    });
}


if (continueBtn) {
    continueBtn.addEventListener('click', async () => {
        const loadingScreen = document.getElementById('loading');
        loadingScreen.classList.add('show');
        const referralCode = referralInput.value.trim() || null;
        const user = auth.currentUser;
        if (user) {
            await createNewUser(user, referralCode);
            window.location.href = 'dashboard.html';
        } else {
            alert('User not authenticated. Please log in again.');
            window.location.href = 'join.html';
        }
        loadingScreen.classList.remove('show');
    });
}

if (skipBtn) {
    skipBtn.addEventListener('click', async () => {
        const loadingScreen = document.getElementById('loading');
        loadingScreen.classList.add('show');
        const user = auth.currentUser;
        if (user) {
            await createNewUser(user, null);
            window.location.href = 'dashboard.html';
        } else {
            alert('User not authenticated. Please log in again.');
            window.location.href = 'join.html';
        }
        loadingScreen.classList.remove('show');
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        userEmail = user.email;
        // Check if we are on dashboard.html
        if (window.location.pathname.endsWith('dashboard.html')) {
            await loadUserDataAndDashboard();
        }
    } else {
        // User is signed out
        if (window.location.pathname.endsWith('dashboard.html') || window.location.pathname.endsWith('referal.html')) {
            window.location.href = 'join.html';
        }
    }
});

async function loadUserDataAndDashboard() {
    const userData = await fetchUserData(userId);
    if (userData) {
        xdBalance = userData.xd || 0;
        userReferralCode = userData.userReferralCode;
        // Update dashboard UI with user data
        updateDashboardUI(userData);
    } else {
        // This case should not happen if the user flow is correct, but as a fallback
        alert('User data not found. Please try logging in again.');
        window.location.href = 'join.html';
    }
}

function updateDashboardUI(userData) {
    document.getElementById('xd-balance').textContent = userData.xd;
    document.getElementById('user-username').textContent = userData.displayName || 'User';
    // Update other dashboard sections as needed
    const profileUsername = document.getElementById('profile-username');
    if (profileUsername) profileUsername.textContent = userData.displayName || 'User';

    const profileXdBalance = document.getElementById('profile-xd-balance');
    if (profileXdBalance) profileXdBalance.textContent = userData.xd;

    const profileReferralCode = document.getElementById('profile-user-referral-code');
    if (profileReferralCode) profileReferralCode.textContent = userData.userReferralCode;

    const referralCodeDisplay = document.getElementById('referral-code-display');
    if (referralCodeDisplay) referralCodeDisplay.textContent = userData.userReferralCode;

    const profileReferredBy = document.getElementById('profile-referred-by');
    if (profileReferredBy) profileReferredBy.textContent = userData.referredBy || 'N/A';
}

async function updateXdBalance(newBalance) {
    xdBalance = newBalance;
    if (document.getElementById('xd-balance')) {
        document.getElementById('xd-balance').textContent = newBalance;
    }
    if (document.getElementById('profile-xd-balance')) {
        document.getElementById('profile-xd-balance').textContent = newBalance;
    }
    // Save to Firestore
    if (userId) {
        await updateUserData(userId, { xd: newBalance });
    }
}
// --- Dashboard Logic ---
if (wheelCanvas) {
    // Spin wheel logic and drawing
    function drawWheel() {
        if (!ctx) return;
        const totalChance = segments.reduce((sum, seg) => sum + seg.chance, 0);
        let startAngle = 0;
        const centerX = wheelCanvas.width / 2;
        const centerY = wheelCanvas.height / 2;
        const radius = wheelCanvas.width / 2;
        ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

        segments.forEach(segment => {
            const sweepAngle = (2 * Math.PI) / segments.length;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sweepAngle);
            ctx.closePath();
            ctx.fillStyle = segment.color;
            ctx.fill();

            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + sweepAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Poppins';
            ctx.fillText(segment.text, radius - 20, 5);
            ctx.restore();

            startAngle += sweepAngle;
        });
    }

    drawWheel();

    //Spinning wheel logic

    //the "free" variable determines if the user got a free spin or not
    let free = false;
    let fullSpinAngle = 0; // make the wheel spin 10 times
    let finalAngle = 0; //made the finalAngle variable global so it won't reset on every call

    function spinWheel() {
        if (isSpinning) return;
        //spins the wheel only when balance>cost or when free is "true"
        if ((xdBalance < spinCost) && free == false) {
            spinMessageEl.textContent = "Not enough XD. Watch an ad for a free spin!";
            return;
        }

        isSpinning = true;
        spinBtn.disabled = true;
        watchAdBtn.disabled = true;
        spinMessageEl.textContent = "";

        // --- Pick winning segment FIRST ---
        const randomChance = Math.random() * totalChance;
        let cumulativeChance = 0;
        let winningSegment = null;
        for (const segment of segments) {
            cumulativeChance += segment.chance;
            if (randomChance < cumulativeChance) {
                winningSegment = segment;
                break;
            }
        }

        // Deduct spin cost
        free ? console.log('hello') : (updateXdBalance(xdBalance - spinCost));

        // Calculate rotation
        const pointerOffset = 90; // offset angle due to the position of the yellow pointer indicating the winning segment
        const winningSegmentIndex = segments.indexOf(winningSegment);
        const segmentsAngle = 360 / segments.length;
        const landingAngle = (360 - (winningSegmentIndex * segmentsAngle)) - pointerOffset - (segmentsAngle / 2);
        finalAngle += landingAngle - finalAngle + 360 * 10;
        fullSpinAngle += 360

        wheelContainer.style.transform = `rotate(${finalAngle + (fullSpinAngle * 10)}deg)`;

        setTimeout(() => {
            // Add winnings
            updateXdBalance(xdBalance + winningSegment.value);

            isSpinning = false;
            free = false;
            console.log(free);
            
            spinBtn.disabled = false;
            watchAdBtn.disabled = false;
            spinBtn.textContent = 'Spin for 999 XD';


            spinMessageEl.textContent =
                winningSegment.text === 'Jackpot'
                    ? `Congratulations! You won the Jackpot!`
                    : `Congratulations! You won ${winningSegment.text}!`;

            winningSegment = null;
            cumulativeChance = 0;
        }, 4000);
    }

    // Placeholder for ad functionality
    // Trigger ad when "Watch Ad" button is clicked
    // --- Replace your old watchAd() function with this ---
    function watchAd() {
        // Remove previous ad if exists
        let oldAd = document.getElementById("hilltopads-script");
        if (oldAd) oldAd.remove();

        // Create container for ad if not exists
        let adContainer = document.getElementById("hilltopads-container");
        if (!adContainer) {
            adContainer = document.createElement("div");
            adContainer.id = "hilltopads-container";
            document.body.appendChild(adContainer);
        }

        // Load HilltopAds script dynamically
        let s = document.createElement("script");
        s.src = "https://enviousgarbage.com/d.mjFxzndMGBNTvtZvGeUa/gegm/9PuYZ/UkljkwPbTJYH1JO/T/kQ3FMuz/MGtiNqjRUX5lOXTDcMzINvAV"; // replace 12345 with your zone ID
        s.id = "hilltopads-script";
        s.async = true;
        s.setAttribute("data-cfasync", "false");
        adContainer.appendChild(s);

        // Give reward after estimated ad duration
        setTimeout(() => {
            alert("You've earned a free spin!");
            spinBtn.textContent = "Spin (Free)";
            spinBtn.disabled = false;
            watchAdBtn.disabled = true;
            free = true;
            console.log(free);
            
        }, 1000); // adjust to match average video/ad length (e.g. 15 sec)
    }


    //This spinWheelForFree function ⬇️ is almost identical to the regular spinWheel function above ⬆️

    // function spinWheelForFree() {
    //     if (isSpinning) return;
    //     isSpinning = true;
    //     spinBtn.disabled = true;
    //     spinMessageEl.textContent = "";

    //     const randomChance = Math.random() * totalChance;
    //     let cumulativeChance = 0;
    //     let winningSegment = null;
    //     for (const segment of segments) {
    //         cumulativeChance += segment.chance;
    //         if (randomChance < cumulativeChance) {
    //             winningSegment = segment;
    //             break;
    //         }
    //     }

    //     const winningSegmentIndex = segments.indexOf(winningSegment);
    //     const segmentsAngle = 360 / segments.length;
    //     const landingAngle = winningSegmentIndex * segmentsAngle + (segmentsAngle / 2);

    //     const randomOffset = (Math.random() - 0.5) * segmentsAngle * 0.8;
    //     const finalAngle = 360 * 10 + landingAngle + randomOffset;

    //     wheelContainer.style.transform = `rotate(${finalAngle}deg)`;

    //     setTimeout(() => {
    //         isSpinning = false;
    //         spinBtn.textContent = 'Spin for 999 XD';
    //         watchAdBtn.disabled = false;

    //         if (winningSegment.text === 'Jackpot') {
    //             spinMessageEl.textContent = `Congratulations! You won the Jackpot!`;
    //         } else {
    //             updateXdBalance(xdBalance + winningSegment.value);
    //             spinMessageEl.textContent = `Congratulations! You won ${winningSegment.text}!`;
    //         }

    //         if (typeof triggerConfetti === 'function') {
    //             triggerConfetti();
    //         }

    //         spinBtn.removeEventListener('click', spinWheelForFree);
    //         spinBtn.addEventListener('click', spinWheel);
    //     }, 4000);
    // }

    spinBtn.addEventListener('click', () => spinWheel());
    watchAdBtn.addEventListener('click', watchAd);

    // --- Confetti VFX (existing code) ---
    const confettiParticles = [];
    const confettiColors = ['#FFD700', '#F1C40F', '#F39C12', '#FFFFFF', '#3498DB'];
    const confettiDuration = 3000;
    const confettiCanvas = document.getElementById('confetti-canvas');
    const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

    if (confettiCanvas) {
        function createConfetti() {
            for (let i = 0; i < 100; i++) {
                confettiParticles.push({
                    x: Math.random() * confettiCanvas.width,
                    y: Math.random() * -confettiCanvas.height,
                    vx: Math.random() * 6 - 3,
                    vy: Math.random() * 3 + 2,
                    rot: Math.random() * 360,
                    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                    opacity: 1,
                    size: Math.random() * 8 + 4
                });
            }
        }

        function drawConfetti() {
            if (!confettiCtx) return;
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            for (let i = 0; i < confettiParticles.length; i++) {
                const p = confettiParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.opacity -= 0.01;

                confettiCtx.save();
                confettiCtx.translate(p.x, p.y);
                confettiCtx.rotate(p.rot * Math.PI / 180);
                confettiCtx.fillStyle = p.color;
                confettiCtx.globalAlpha = p.opacity;
                confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                confettiCtx.restore();

                if (p.y > confettiCanvas.height || p.opacity <= 0) {
                    confettiParticles.splice(i, 1);
                    i--;
                }
            }
            if (confettiParticles.length > 0) {
                requestAnimationFrame(drawConfetti);
            }
        }

        function triggerConfetti() {
            createConfetti();
            drawConfetti();
            setTimeout(() => {
                confettiParticles.length = 0;
            }, confettiDuration);
        }
        window.triggerConfetti = triggerConfetti;
    }
}

//--Withdraw Logic--
function calculateWithdrawAmounts() {
    const rbxAmount = parseFloat(redeemAmountRbxInput.value) || 0;
    const xdNeeded = rbxAmount * RBX_TO_XD_RATE;
    const gamepassValue = Math.round((rbxAmount * 10) / 7);

    xdDeductedAmountEl.textContent = xdNeeded;
    gamepassAmountEl.textContent = gamepassValue;

    // Enable withdraw button only if RBX >= 7 and user has enough XD
    withdrawBtn.disabled = rbxAmount < MIN_WITHDRAW_RBX || xdNeeded > xdBalance;
}

async function handleWithdraw(event) {
    event.preventDefault();

    const rbxAmount = parseFloat(redeemAmountRbxInput.value) || 0;
    const robloxUsername = robloxUsernameInput.value.trim();
    const xdNeeded = rbxAmount * RBX_TO_XD_RATE;

    // Validate inputs
    if (rbxAmount < MIN_WITHDRAW_RBX) {
        alert(`Minimum withdrawal amount is ${MIN_WITHDRAW_RBX} RBX.`);
        return;
    }
    if (!robloxUsername) {
        alert("Please enter your Roblox username.");
        return;
    }
    if (xdNeeded > xdBalance) {
        alert("Not enough XD for this withdrawal.");
        return;
    }

    try {
        // Deduct XD from balance
        const newBalance = xdBalance - xdNeeded;
        await updateXdBalance(newBalance);

        // Save withdrawal request to Firestore
        const withdrawDocRef = doc(collection(db, 'withdrawals'));
        await setDoc(withdrawDocRef, {
            userId: userId,
            robloxUsername: robloxUsername,
            rbxAmount: rbxAmount,
            xdDeducted: xdNeeded,
            gamepassValue: Math.round((rbxAmount * 10) / 7),
            status: 'pending',
            createdAt: serverTimestamp(),
        });

        // Save notification for admin
        const notificationDocRef = doc(collection(db, 'admin_notifications'));
        await setDoc(notificationDocRef, {
            message: `A new request for withdraw has been submitted: ${rbxAmount} RBX, ${xdNeeded} XD, Roblox Username: ${robloxUsername}`,
            userId: userId,
            createdAt: serverTimestamp(),
            read: false,
        });

        alert("Withdrawal request submitted successfully!");
        withdrawForm.reset();
        xdDeductedAmountEl.textContent = '0';
        gamepassAmountEl.textContent = '0';
        withdrawBtn.disabled = true;
    } catch (error) {
        console.error("Withdrawal failed:", error);
        alert(`Withdrawal failed: ${error.message}`);
    }
}

// Add event listener for withdraw form submission
if (withdrawForm) {
    withdrawForm.addEventListener('submit', handleWithdraw);
}

// Add event listener for input changes if not already added via HTML
if (redeemAmountRbxInput) {
    redeemAmountRbxInput.addEventListener('input', calculateWithdrawAmounts);
}

// --- Logout and Navigation Logic ---
if (document.getElementById('logout-btn')) {
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.clear();
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Logout failed. Please try again.");
        }
    });
}

// Handle navigation
const navLinks = document.querySelectorAll('.nav-link');
const mainContentWrapper = document.getElementById('main-content-wrapper');
if (navLinks.length > 0 && mainContentWrapper) {
    const sections = mainContentWrapper.querySelectorAll('.app-section');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = e.target.dataset.section + '-section';
            sections.forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('opacity-100');
                section.classList.add('opacity-0');
            });
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                setTimeout(() => {
                    targetSection.classList.remove('opacity-0');
                    targetSection.classList.add('opacity-100');
                }, 50);
            }
            document.getElementById('sidebar').classList.remove('translate-x-0');
            document.getElementById('sidebar').classList.add('translate-x-full');
            // Animate hamburger icon back
            document.querySelector('.hamburger-icon span:nth-child(1)').style.transform = 'rotate(0deg) translate(0, 0)';
            document.querySelector('.hamburger-icon span:nth-child(2)').style.opacity = '1';
            document.querySelector('.hamburger-icon span:nth-child(3)').style.transform = 'rotate(0deg) translate(0, 0)';
        });
    });
}
// Handle menu button click
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const closeMenuBtn = document.getElementById('close-menu-btn');
if (menuBtn && sidebar && closeMenuBtn) {
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('translate-x-full');
        sidebar.classList.toggle('translate-x-0');

        // Animate hamburger icon
        const spans = document.querySelectorAll('.hamburger-icon span');
        if (sidebar.classList.contains('translate-x-0')) {
            spans[0].style.transform = 'rotate(45deg) translate(8px, 8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(8px, -8px)';
        } else {
            spans[0].style.transform = 'rotate(0deg) translate(0, 0)';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'rotate(0deg) translate(0, 0)';
        }
    });
    closeMenuBtn.addEventListener('click', () => {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('translate-x-full');
        // Animate hamburger icon back
        const spans = document.querySelectorAll('.hamburger-icon span');
        spans[0].style.transform = 'rotate(0deg) translate(0, 0)';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'rotate(0deg) translate(0, 0)';
    });
}

// Handle copy referral code button
const copyReferralBtn = document.getElementById('copy-referral-btn');
if (copyReferralBtn) {
    copyReferralBtn.addEventListener('click', () => {
        const referralCodeText = document.getElementById('referral-code-display').textContent;
        navigator.clipboard.writeText(referralCodeText).then(() => {
            alert('Referral code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy referral code:', err);
        });
    });
};
