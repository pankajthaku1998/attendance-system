function apiCall(params) {
    var url = new URL(CONFIG.API_URL);
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
        url.searchParams.append(keys[i], params[keys[i]]);
    }
    showLoader();
    return fetch(url.toString())
        .then(function (response) { return response.json(); })
        .then(function (data) { hideLoader(); return data; })
        .catch(function (error) {
            hideLoader();
            console.error('API Error:', error);
            showToast('Network error. Please try again.', 'error');
            return { success: false, message: 'Network error' };
        });
}

function showLoader() {
    var loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = '<div class="loader-overlay"><div class="loader-spinner"><div class="spinner"></div><p>Please wait...</p></div></div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'block';
}

function hideLoader() {
    var loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
}

function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    var icons = { success: '\u2713', error: '\u2717', warning: '!', info: 'i' };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<div class="toast-content"><span class="toast-icon">' + (icons[type] || 'i') + '</span><span>' + message + '</span></div>';
    container.appendChild(toast);
    setTimeout(function () { toast.classList.add('show'); }, 10);
    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
}

function formatDate(date) {
    var d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTodayDate() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getMonthName(m) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[m - 1] || '';
}

function generateClassOptions() {
    var html = '';
    for (var i = 0; i < CONFIG.CLASSES.length; i++) {
        html += '<option value="' + CONFIG.CLASSES[i] + '">Class ' + CONFIG.CLASSES[i] + '</option>';
    }
    return html;
}

function generateSectionOptions() {
    var html = '';
    for (var i = 0; i < CONFIG.SECTIONS.length; i++) {
        html += '<option value="' + CONFIG.SECTIONS[i] + '">Section ' + CONFIG.SECTIONS[i] + '</option>';
    }
    return html;
}

function checkAdminSession() {
    var session = sessionStorage.getItem(CONFIG.ADMIN_SESSION);
    if (!session) { window.location.href = 'index.html'; return null; }
    return JSON.parse(session);
}

function checkTeacherSession() {
    var session = sessionStorage.getItem(CONFIG.TEACHER_SESSION);
    if (!session) { window.location.href = 'index.html'; return null; }
    return JSON.parse(session);
}

function logout() {
    sessionStorage.removeItem(CONFIG.ADMIN_SESSION);
    sessionStorage.removeItem(CONFIG.TEACHER_SESSION);
    window.location.href = 'index.html';
}

function showModal(title, content, footer) {
    var modal = document.getElementById('app-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'app-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal"><div class="modal-header"><h3>' + title + '</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body">' + content + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</div>';
    document.body.appendChild(modal);
    setTimeout(function () { modal.classList.add('show'); }, 10);
}

function closeModal() {
    var modal = document.getElementById('app-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(function () { modal.remove(); }, 300);
    }
}

function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;
    var headers = Object.keys(data[0]);
    var lines = [headers.join(',')];
    for (var i = 0; i < data.length; i++) {
        var row = [];
        for (var j = 0; j < headers.length; j++) {
            var val = String(data[i][headers[j]] || '').replace(/"/g, '""');
            row.push('"' + val + '"');
        }
        lines.push(row.join(','));
    }
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function printElement(elementId) {
    var content = document.getElementById(elementId);
    if (!content) return;
    var win = window.open('', '_blank');
    win.document.write('<html><head><title>Print - ' + CONFIG.SCHOOL_NAME + '</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#1a237e;color:#fff}.header{text-align:center;margin-bottom:20px}.header h1{color:#1a237e;margin:0}.stats-grid{display:flex;gap:10px;flex-wrap:wrap;margin:15px 0}.stat-card{padding:10px;background:#f5f5f5;border-radius:5px;min-width:120px;border-left:3px solid #1a237e}.badge{padding:2px 8px;border-radius:10px;font-size:11px}.badge-present{background:#e8f5e9;color:#2e7d32}.badge-absent{background:#ffebee;color:#c62828}.badge-leave{background:#fff3e0;color:#e65100}</style></head><body><div class="header"><h1>' + CONFIG.SCHOOL_NAME + '</h1></div>' + content.innerHTML + '</body></html>');
    win.document.close();
    win.print();
}