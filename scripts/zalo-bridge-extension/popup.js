// Load saved rooms
chrome.storage.sync.get(['monitoredRooms'], (result) => {
    if (result.monitoredRooms) {
        document.getElementById('rooms').value = result.monitoredRooms.join('\n');
    }
});

// Save rooms
document.getElementById('save').addEventListener('click', () => {
    const text = document.getElementById('rooms').value;
    const rooms = text.split('\n').map(r => r.trim()).filter(r => r !== '');
    chrome.storage.sync.set({ monitoredRooms: rooms }, () => {
        alert('Đã lưu cấu hình! Vui lòng tải lại trang Zalo Web.');
    });
});
