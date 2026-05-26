import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeAuth,
    browserLocalPersistence,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDoc,
    setDoc,
    query, 
    where, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBBB8xDItXy26YVzhO3YbHitQ1AGbo-jZI",
  authDomain: "tienditadigital.firebaseapp.com",
  projectId: "tienditadigital",
  storageBucket: "tienditadigital.firebasestorage.app",
  messagingSenderId: "460711647500",
  appId: "1:460711647500:web:6f24dc5ccd31baf5001129"
};


const appAdmin = initializeApp(firebaseConfig, "AdminAppInstance");

const auth = initializeAuth(appAdmin, {
  persistence: browserLocalPersistence
});

const db = getFirestore(appAdmin);

let currentUser = null;
let unsubscribeInventory = null;
let unsubscribeSales = null;


window.toggleAuthMode = toggleAuthMode;
window.handleRegisterOwner = handleRegisterOwner;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.handleSaveProduct = handleSaveProduct;
window.prepareEdit = prepareEdit;
window.deleteProduct = deleteProduct;
window.resetForm = resetForm;


onAuthStateChanged(auth, async (user) => {
    const loadingScreen = document.getElementById('loading-screen');
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (user) {
        try {
           
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().rol === "dueno") {
                currentUser = user;

                if (document.getElementById('display-owner-name')) {
                    document.getElementById('display-owner-name').innerText = user.displayName || "Dueño";
                }

                if (authView) authView.classList.add('hidden');
                if (dashboardView) dashboardView.classList.remove('hidden');

                listenToUserInventory(user.uid);
                listenToUserSales(); 
            } else {
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                const reSnap = await getDoc(userDocRef);
                
                if (reSnap.exists() && reSnap.data().rol === "dueno") {
                    currentUser = user;
                    if (document.getElementById('display-owner-name')) {
                        document.getElementById('display-owner-name').innerText = user.displayName || "Dueño";
                    }
                    if (authView) authView.classList.add('hidden');
                    if (dashboardView) dashboardView.classList.remove('hidden');
                    listenToUserInventory(user.uid);
                    listenToUserSales();
                } else {
                    showNotification("Acceso denegado. Esta cuenta no es de Administrador/Dueño.", true);
                    signOut(auth);
                }
            }
        } catch (error) {
            console.error("Error verificando rol de dueño:", error);
            signOut(auth);
        }
    } else {
        currentUser = null;

        if (unsubscribeInventory) { unsubscribeInventory(); unsubscribeInventory = null; }
        if (unsubscribeSales) { unsubscribeSales(); unsubscribeSales = null; }

        if (dashboardView) dashboardView.classList.add('hidden');
        if (authView) authView.classList.remove('hidden');
    }

    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
});


function showNotification(message, isAlert = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';

    toast.innerHTML = isAlert
        ? `<i class="fa-solid fa-triangle-exclamation" style="color:#ff9800;"></i> <span>${message}</span>`
        : `<i class="fa-solid fa-circle-check" style="color:#4caf50;"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = '0.3s';
        setTimeout(() => { toast.remove(); }, 300);
    }, 2800);
}


function toggleAuthMode(event, mode) {
    if (event) event.preventDefault();
    const cardLogin = document.getElementById('card-login');
    const cardRegister = document.getElementById('card-register');

    if (mode === 'register') {
        if (cardLogin) cardLogin.classList.add('hidden');
        if (cardRegister) cardRegister.classList.remove('hidden');
    } else {
        if (cardRegister) cardRegister.classList.add('hidden');
        if (cardLogin) cardLogin.classList.remove('hidden');
    }
}


function handleRegisterOwner(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    let userCreated = null;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            userCreated = userCredential.user;
            return updateProfile(userCreated, { displayName: name });
        })
        .then(() => {
            return setDoc(doc(db, "usuarios", userCreated.uid), {
                nombre: name,
                correo: email,
                rol: "dueno"
            });
        })
        .then(() => {
            showNotification("Cuenta de Dueño creada correctamente.");
            
            currentUser = userCreated;
            if (document.getElementById('display-owner-name')) {
                document.getElementById('display-owner-name').innerText = name;
            }
            const authView = document.getElementById('auth-view');
            const dashboardView = document.getElementById('dashboard-view');
            if (authView) authView.classList.add('hidden');
            if (dashboardView) dashboardView.classList.remove('hidden');
            listenToUserInventory(userCreated.uid);
            listenToUserSales();
        })
        .catch((error) => {
            console.error(error);
            showNotification(error.message, true);
        });
}


function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            showNotification("Bienvenido nuevamente.");
        })
        .catch((error) => {
            console.error(error);
            showNotification("Correo o contraseña incorrectos.", true);
        });
}


function handleLogout() {
    signOut(auth).then(() => { showNotification("Sesión cerrada."); });
}


function listenToUserInventory(ownerId) {
    const q = query(collection(db, "productos"), where("ownerId", "==", ownerId));

    unsubscribeInventory = onSnapshot(q, (querySnapshot) => {
        const tbody = document.getElementById('inventory-table-body');
        const widgetTotal = document.getElementById('widget-total-products');
        
        if (!tbody) return;
        tbody.innerHTML = '';
        if (widgetTotal) widgetTotal.innerText = querySnapshot.size;

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;">No hay productos registrados.</td></tr>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const idDoc = docSnap.id;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="table-prod-cell">
                        <i class="fa-solid ${prod.icon || 'fa-box'}"></i>
                        <span>${prod.name || 'Sin Nombre'}</span>
                    </div>
                </td>
                <td>${prod.desc || ''}</td>
                <td><span class="table-price">$${parseFloat(prod.price || 0).toFixed(2)}</span></td>
                <td><strong style="${parseInt(prod.stock || 0) === 0 ? 'color: red;' : ''}">${prod.stock || 0}</strong></td>
                <td style="text-align:center;">
                    <button class="btn-action btn-edit" title="Editar" onclick="prepareEdit('${idDoc}','${prod.name || ''}',${prod.price || 0},${prod.stock || 0},'${prod.icon || 'fa-box'}','${prod.desc || ''}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Eliminar" onclick="deleteProduct('${idDoc}', '${prod.name || ''}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

    }, (error) => { console.error(error); });
}


function handleSaveProduct(event) {
    event.preventDefault();
    if (!currentUser) return;

    const idDocHidden = document.getElementById('product-id-hidden').value;
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value) || 0;
    const stock = parseInt(document.getElementById('prod-stock').value) || 0;
    const icon = document.getElementById('prod-icon').value;
    const desc = document.getElementById('prod-desc').value.trim();

    if (idDocHidden) {
        const docRef = doc(db, "productos", idDocHidden);
        updateDoc(docRef, { name, price, stock, icon, desc })
        .then(() => {
            showNotification("Producto actualizado.");
            resetForm();
        })
        .catch((err) => { showNotification(err.message, true); });
    } else {
        const nuevoProducto = {
            ownerId: currentUser.uid,
            name,
            price,
            stock,
            icon,
            desc,
            timestamp: Date.now()
        };

        addDoc(collection(db, "productos"), nuevoProducto)
            .then(() => {
                showNotification("Producto agregado.");
                resetForm();
            })
            .catch((err) => { showNotification(err.message, true); });
    }
}


function prepareEdit(idDoc, name, price, stock, icon, desc) {
    const cardContainer = document.getElementById('product-card-container');
    const formTitle = document.getElementById('form-title');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const btnSubmit = document.getElementById('btn-submit-form');

    if (cardContainer) cardContainer.classList.add('editing-mode');
    if (formTitle) formTitle.innerHTML = `<i class="fa-solid fa-pen"></i> Editar Producto`;
    if (btnCancel) btnCancel.classList.remove('hidden');
    if (btnSubmit) btnSubmit.innerHTML = `Actualizar Producto`;

    document.getElementById('product-id-hidden').value = idDoc;
    document.getElementById('prod-name').value = name;
    document.getElementById('prod-price').value = price;
    document.getElementById('prod-stock').value = stock;
    document.getElementById('prod-icon').value = icon;
    document.getElementById('prod-desc').value = desc;
}


function deleteProduct(idDoc, name) {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    const docRef = doc(db, "productos", idDoc);
    deleteDoc(docRef)
        .then(() => { showNotification("Producto eliminado."); })
        .catch((err) => { showNotification(err.message, true); });
}


function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id-hidden').value = "";
    
    const cardContainer = document.getElementById('product-card-container');
    const formTitle = document.getElementById('form-title');
    const btnSubmit = document.getElementById('btn-submit-form');
    const btnCancel = document.getElementById('btn-cancel-edit');

    if (cardContainer) cardContainer.classList.remove('editing-mode');
    if (formTitle) formTitle.innerHTML = `<i class="fa-solid fa-circle-plus color-green"></i> Agregar Producto`;
    if (btnSubmit) btnSubmit.innerHTML = `Guardar en Estante <i class="fa-solid fa-floppy-disk"></i>`;
    if (btnCancel) btnCancel.classList.add('hidden');
}


function listenToUserSales() {
    const q = collection(db, "ganancias");

    unsubscribeSales = onSnapshot(q, (querySnapshot) => {
        const tbody = document.getElementById('sales-table-body');
        const widgetEarnings = document.getElementById('widget-total-earnings');
        
        if (!tbody) return;
        tbody.innerHTML = '';
        let totalAcumuladoGanancias = 0;

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;">Esperando compras de clientes...</td></tr>`;
            if (widgetEarnings) widgetEarnings.innerText = "$0.00";
            return;
        }

        const todasLasLineasDeVenta = [];

        querySnapshot.forEach((docSnap) => {
            const nota = docSnap.data();
            totalAcumuladoGanancias += parseFloat(nota.total || 0);

            let milisegundos = Date.now();
            if (nota.fecha) {
                milisegundos = nota.fecha.seconds ? nota.fecha.seconds * 1000 : new Date(nota.fecha).getTime();
            }

            if (nota.productos && Array.isArray(nota.productos)) {
                nota.productos.forEach((prodComprado) => {
                    todasLasLineasDeVenta.push({
                        timestamp: milisegundos,
                        cliente: nota.clienteNombre || "Vecino Anónimo",
                        productoNombre: prodComprado.name || "Producto comprado",
                        cantidad: prodComprado.qty || 1,
                        subtotal: prodComprado.subtotal || (prodComprado.price * (prodComprado.qty || 1))
                    });
                });
            }
        });

        todasLasLineasDeVenta.sort((a, b) => b.timestamp - a.timestamp);
        if (widgetEarnings) widgetEarnings.innerText = `$${totalAcumuladoGanancias.toFixed(2)}`;

        todasLasLineasDeVenta.forEach((linea) => {
            const row = document.createElement('tr');
            const dateObj = new Date(linea.timestamp);
            const fechaLegible = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const horaLegible = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            row.innerHTML = `
                <td>
                    <div style="font-size:0.85rem; color:var(--text-main); font-weight:700;">
                        <i class="fa-regular fa-calendar-days" style="color:var(--text-muted)"></i> ${fechaLegible}
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">
                        <i class="fa-regular fa-clock"></i> ${horaLegible}
                    </div>
                </td>
                <td><i class="fa-solid fa-user-tag" style="font-size:0.8rem; color:var(--accent-orange);"></i> ${linea.cliente}</td>
                <td><strong>${linea.productoNombre}</strong></td>
                <td><span class="admin-badge" style="background:var(--border-soft); color:var(--brown-dark); padding: 0.1rem 0.5rem;">x${linea.cantidad}</span></td>
                <td><span class="table-price" style="color:var(--accent-blue); font-weight:bold;">$${parseFloat(linea.subtotal).toFixed(2)}</span></td>
            `;
            tbody.appendChild(row);
        });

    }, (error) => {
        console.error("Error leyendo colección de ganancias: ", error);
    });
}
