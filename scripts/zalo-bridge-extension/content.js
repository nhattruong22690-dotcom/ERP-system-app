console.log('ERP Zalo Bridge: Đã được kích hoạt');

const ERP_API_URL = 'http://localhost:3000/api/zalo/tracking';
let monitoredRooms = [];
const trackingCache = {}; // Cache dữ liệu để không gọi API khi Zalo re-render

// Load monitored rooms structure
chrome.storage.sync.get(['monitoredRooms'], (result) => {
    monitoredRooms = result.monitoredRooms || [];
    console.log('ERP Zalo Bridge: Các phòng đang theo dõi:', monitoredRooms.length > 0 ? monitoredRooms : 'Tất cả');
});

// Hàm lấy tên phòng đang mở định dạng Zalo
function getCurrentRoomName() {
    // Tìm thẻ header title (Zalo thường có class title-container hoặc pr trong header)
    const titleElement = document.querySelector('.header-title, #header-title, .title-container .truncate, [data-id="div_Main_Header_Title"]');
    if (titleElement) return titleElement.innerText.trim();

    // Fallback thử các thẻ chứa tên trên top
    const fallback = document.querySelector('header span[title], header div[title]');
    return fallback ? fallback.getAttribute('title').trim() : '';
}

// Hàm tìm kiếm và hiển thị dữ liệu
async function handleTracking(phone, element) {
    if (element.dataset.processed || element.querySelector('.erp-info-box')) return;

    // Kiểm tra cấu hình phòng
    const currentRoom = getCurrentRoomName();
    if (monitoredRooms.length > 0 && currentRoom && !monitoredRooms.includes(currentRoom)) {
        return; // Đã check, bỏ qua nhưng không log để đỡ rác console
    }

    element.dataset.processed = 'true';

    let data;
    let isOk = false;

    // Lấy từ cache nếu có
    if (trackingCache[phone]) {
        data = trackingCache[phone].data;
        isOk = trackingCache[phone].isOk;
    } else {
        console.log(`ERP Bridge: Fetch API cho SĐT ${phone}...`);
        try {
            const response = await fetch(`${ERP_API_URL}?phone=${phone}`);
            data = await response.json();
            isOk = response.ok;
            trackingCache[phone] = { data, isOk }; // Lưu vào cache
        } catch (error) {
            console.log('ERP Zalo Bridge: Lỗi khi gọi API (có thể do kết nối mạng)', error.message);
            return;
        }
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'erp-info-box';

    if (isOk) {
        const customers = Array.isArray(data) ? data : [data];
        let htmlContent = '';

        customers.forEach((c, index) => {
            const separator = index > 0 ? '<div style="height: 1px; background: #90caf9; margin: 8px 0;"></div>' : '';
            htmlContent += `
                ${separator}
                <div style="font-weight: 700; color: #1d4ed8; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                    <span>📋 ERP:</span> ${c.fullName} ${customers.length > 1 ? `<span style="font-size: 11px; background: #2196f3; color: white; padding: 2px 6px; border-radius: 10px;">${index + 1}/${customers.length}</span>` : ''}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <div>📱 <b>SĐT:</b> <span style="font-size:11px">${c.phone}</span></div>
                    <div style="text-align: right;">🏆 <b>Hạng:</b> ${c.rank}</div>
                    <div>💰 <b>Chi:</b> ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.totalSpent)}</div>
                    <div style="text-align: right;">⭐ <b>Điểm:</b> ${c.points}</div>
                </div>
                <div style="margin-top: 6px; border-top: 1px dashed #bfdbfe; padding-top: 4px;">📅 <b>Gần:</b> ${c.lastVisit}</div>
            `;
        });

        infoDiv.innerHTML = `
            <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 10px; margin-top: 8px; font-size: 12px; color: #1e3a8a; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: default; width: fit-content; min-width: 250px; max-width: 100%; box-sizing: border-box;" onclick="event.stopPropagation()">
                ${htmlContent}
            </div>
        `;
    } else {
        infoDiv.innerHTML = `
            <div style="background: #fff7ed; border: 1px solid #fb923c; border-radius: 8px; padding: 10px; margin-top: 8px; font-size: 12px; color: #9a3412; cursor: default; width: fit-content; min-width: 250px; max-width: 100%; box-sizing: border-box;" onclick="event.stopPropagation()">
                ⚠️ <b>ERP:</b> Không tìm thấy khách hàng
            </div>
        `;
    }

    // Zalo DOM is tricky, append to the bubble content directly if possible
    const bubbleContent = element.querySelector('.text') || element;
    if (bubbleContent && bubbleContent.parentElement) {
        bubbleContent.parentElement.appendChild(infoDiv);
    } else {
        element.appendChild(infoDiv);
    }
}

// Hàm quét toàn bộ DOM để tìm text
const scanMessages = () => {
    // Zalo chat bubbles thường dùng class chứa 'chat-message' hoặc 'msg-item'
    const messageBubbles = document.querySelectorAll('.msg-item__bubble, .chat-message, [data-id="div_Message_Bubble"]');

    messageBubbles.forEach(bubble => {
        if (!bubble.dataset.processed) {
            const textContent = bubble.innerText || bubble.textContent;
            if (textContent && /\[tracking\]/i.test(textContent)) {
                // Nhận dạng SĐT tối thiểu 9 số, tối đa 12 số sau chữ [tracking]
                const match = textContent.match(/\[tracking\]\s*(\d{9,12})/i);
                if (match) {
                    handleTracking(match[1], bubble);
                }
            }
        }
    });
};

const observer = new MutationObserver((mutations) => {
    // Chỉ kích hoạt scan nếu có node thêm vào (chống lag do React Virtual DOM trên Zalo)
    let shouldScan = false;
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldScan = true;
            break;
        }
    }
    if (shouldScan) {
        // Dùng timeout nhỏ để Zalo render xong text
        setTimeout(scanMessages, 100);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Chạy định kỳ 2s một lần để quét các tin nhắn cũ / trường hợp observer miss (Do Virtual DOM của Zalo)
setInterval(scanMessages, 2000);
console.log('ERP Zalo Bridge: Đã bắt đầu quét tin nhắn định kỳ...');
