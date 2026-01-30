# 🚀 SuperSync: The Bridge Between Sheets & SQL
### Real-Time Bi-Directional Data Synchronization



[Image of Database synchronization architecture]


## 📖 The Backstory
In the modern workplace, teams love **Google Sheets** for its collaboration, but developers need **PostgreSQL/MySQL** for its power and scalability. Usually, keeping these two in sync is a manual nightmare of exporting CSVs and re-importing data.

**SuperSync** solves this by creating a real-time, bi-directional bridge. When you type in a cell, the database updates. When the database changes, the sheet reflects it instantly. 

---

## 🛠️ Tech Stack
* **Backend:** Node.js (Express)
* **Database:** PostgreSQL (Hosted on AWS for scalability)
* **Cloud Logic:** Google Apps Script
* **Tunneling:** Ngrok (For local development and debugging)
* **Architecture:** Clean MVC (Model-View-Controller)

---

## 🏗️ Project Structure
I organized this project using a strict MVC pattern to ensure the code is modular, readable, and easy to scale.

| Directory | Responsibility |
| :--- | :--- |
| **`src/controllers`** | The "brains"—handling logic for both Sheets and Dashboard. |
| **`src/services`** | The "connectors"—managing heavy lifting for API calls and Google Auth. |
| **`src/models`** | The "structure"—defining how our data is mapped. |
| **`src/routes`** | The "map"—directing traffic between endpoints. |
| **`src/utils`** | The "helpers"—database notification listeners and data validators. |
| **`src/config`** | The "foundation"—handling database connections and credentials. |

---

## 💡 My Approach: "Push, Don't Pull"
Instead of using inefficient polling (which constantly asks the server for updates), I implemented a push-based system:

* **Google to DB:** I used `onEdit` triggers in Google Apps Script. The moment a cell is edited, it **pushes** a payload to the backend. This avoids hitting API rate limits and feels instantaneous.
* **DB to Google:** I implemented **PostgreSQL Notification Triggers**. The database literally "notifies" the backend the moment a row changes using a listener in the `utils` folder.
* **The Infinite Loop Shield:** To prevent the sync from triggering itself (Looping), I used a flagging system. If a change originates from the Sheet, it is flagged so the DB update doesn't trigger a "reply" back to the Sheet.

---

## 🚀 The "Aha!" Moment: Ngrok to the Rescue
During development, I hit a wall: Google Apps Script (in the cloud) couldn't see my server running on `localhost`. 

I discovered **Ngrok**, which created a secure tunnel from the web straight to my local machine. This allowed me to test the real-time triggers in a live environment without deploying to a VPS every 5 minutes. This was a massive boost to my productivity.

---

## ⚙️ How to Setup
1.  **Clone the Repo:**
    ```bash
    git clone [https://github.com/SOURAVi0001/SuperSync.git](https://github.com/SOURAVi0001/SuperSync.git)
    cd SuperSync
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment:**
    * Create a `.env` file with your AWS PostgreSQL credentials.
    * Place your `googleSheetsCredentials.json` in `src/config/`.
4.  **Expose Localhost:**
    ```bash
    ngrok http 5000
    ```
5.  **Google Apps Script:**
    * Copy the code from `extensions/google-app-script.js`.
    * Paste it into your Sheet's **Extensions > Apps Script**.
    * Update the `BASE_URL` with your Ngrok URL.

---

## 👨‍💻 About the Developer
**Sourav Pander**
* **Education:** B.Tech CSE @ IIIT Bhopal (Batch of 2026)
* **Achievements:** LeetCode Knight (1000+ problems solved)
* **Focus:** Full-Stack Development | AI Engineering

---
*Developed as part of a 48-hour synchronization challenge.*