# 📢 ระบบร้องเรียนมหาวิทยาลัย (University Complaint System)

ระบบเว็บแอปสำหรับยื่นเรื่องร้องเรียนไปยังผู้บริหารระดับสูงของมหาวิทยาลัย  
รองรับการยื่นเรื่องแบบไม่เปิดเผยชื่อ ติดตามสถานะ และมีระบบจัดการสำหรับผู้ดูแลระบบ (Admin)

---

## ✨ คุณสมบัติ (Features)

- **สมัครสมาชิก / เข้าสู่ระบบ** ด้วยอีเมลและรหัสผ่าน
- **ตั้งค่าโปรไฟล์** (ชื่อ-นามสกุล, เบอร์โทร, คณะ/หน่วยงาน)
- **ยื่นเรื่องร้องเรียน** เลือกประเภท, ผู้รับเรื่อง, ระบุหัวข้อและรายละเอียด
- **ติดตามสถานะเรื่องร้องเรียน** ด้วยหมายเลขติดตาม
- **ส่งแบบไม่เปิดเผยชื่อ (Anonymous)** ได้
- **ระบบผู้บริหารและแอดมิน**
  - เห็นเฉพาะเรื่องที่ส่งถึงตนเอง (ยกเว้นแอดมินเห็นทุกเรื่อง)
  - ปรับสถานะเรื่องร้องเรียน (`pending`, `processing`, `resolved`)
- **จัดการสมาชิก (Admin)**
  - ค้นหาและแก้ไขโปรไฟล์
  - เปลี่ยนบทบาทผู้ใช้
  - รีเซ็ตรหัสผ่าน

---

## 📦 เทคโนโลยีที่ใช้

- **Frontend:** HTML5, TailwindCSS, JavaScript
- **Backend:** Firebase Authentication, Cloud Firestore
- **Security:** Firebase App Check (reCAPTCHA v3)

---

## 🚀 การติดตั้งและใช้งาน

### 1. เตรียมเครื่องมือ
- ติดตั้ง [Node.js](https://nodejs.org) (แนะนำ LTS)
- ติดตั้ง Firebase CLI
  ```bash
  npm install -g firebase-tools
  ```
- มีบัญชี Google เพื่อสร้างโปรเจกต์ Firebase

---

### 2. สร้างโปรเจกต์ Firebase
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → ตั้งชื่อโปรเจกต์ → ปิด/เปิด Analytics ตามต้องการ
3. สร้าง **Web App** และคัดลอกค่า `firebaseConfig`

---

### 3. เปิดใช้งานบริการ
- **Authentication** → เปิด Email/Password
- **Firestore Database** → Create database → Start in test mode
- (แนะนำ) **App Check** → เปิด reCAPTCHA v3

---

### 4. ดาวน์โหลดซอร์สโค้ด
```
> วางไฟล์ HTML และ JS ทั้งหมดในโฟลเดอร์ `public/`  

---
```

### 5. ตั้งค่า `firebase-config.js`
นำค่าที่ได้จาก Firebase มาใส่:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
```

---

### 6. เริ่มตั้งค่า Firebase Hosting
```bash
firebase login
firebase init
```
- เลือก Hosting
- เลือกโปรเจกต์ที่สร้างไว้
- ใส่ `public` เป็นโฟลเดอร์
- ตอบ `N` สำหรับ Single Page App

---

### 7. Deploy ขึ้นโฮสติ้ง
```bash
firebase deploy
```
หลังจากเสร็จ จะได้ URL เช่น  
```
Hosting URL: https://complaint-system.web.app
```

---

## 🔒 ตั้งค่า Firestore Rules
เพื่อความปลอดภัย ควรตั้ง Rules แบบนี้:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /complaints/{docId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    match /users/{userId} {
      allow read, update: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 👥 บทบาทผู้ใช้
- **user:** ยื่นเรื่องร้องเรียน, ตรวจสอบสถานะ
- **rector:** เห็นเฉพาะเรื่องที่ส่งถึงอธิการบดี
- **board-chairman:** เห็นเฉพาะเรื่องที่ส่งถึงประธานกรรมการมหาวิทยาลัย
- **vice-rector:** เห็นเฉพาะเรื่องที่ส่งถึงรองอธิการบดี
- **university-council:** เห็นเฉพาะเรื่องที่ส่งถึงสภามหาวิทยาลัย
- **admin:** เห็นและจัดการได้ทุกเรื่อง + จัดการสมาชิก

---

## 📄 License
MIT License
