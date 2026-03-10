# TaskFlow — Smart Todo List

A full-featured todo list web application built with **HTML, CSS, JavaScript** and **Supabase** (PostgreSQL + Auth).

---

## 🚀 Quick Setup

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon/public API key** from **Settings → API**.

### 2. Create the Database Table
1. In your Supabase dashboard, go to **SQL Editor → New Query**.
2. Paste the contents of `supabase_schema.sql` and click **Run**.
3. This creates the `tasks` table with Row-Level Security so each user can only access their own data.

### 3. Configure the App
Open `app.js` and replace the placeholder values at the top:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 4. Open the App
Simply open `index.html` in your browser — no build tools required.

> For local development you can also use a simple HTTP server:
> ```bash
> npx serve .
> ```

---

## ✅ Features

| Category | Features |
|---|---|
| **Auth** | Sign up, log in, log out (Supabase Auth) |
| **CRUD** | Create, read, update, delete tasks |
| **Status** | Toggle Completed / Pending via checkbox |
| **Priority** | High / Medium / Low with color indicators |
| **Search** | Real-time search by task title or description |
| **Filters** | Filter by status and priority |
| **Sorting** | Sort by due date, priority, or creation time |
| **Dashboard** | Total, completed, pending counts + progress bar |
| **Validation** | Non-empty title, future due dates, auth-gated actions |
| **Persistence** | Data stored in Supabase PostgreSQL, syncs across devices |
| **Responsive** | Works on desktop, tablet, and mobile |

---

## 📁 Project Structure

```
todo_list/
├── index.html            # Main HTML page
├── style.css             # All styles
├── app.js                # Application logic + Supabase integration
├── supabase_schema.sql   # Database schema (run in Supabase SQL Editor)
└── README.md             # This file
```

---

## 🗄️ Database Schema

| Column | Type | Description |
|---|---|---|
| `task_id` | BIGINT (auto) | Primary key |
| `user_id` | UUID | References `auth.users` |
| `task_title` | TEXT | Task name (required) |
| `task_description` | TEXT | Optional details |
| `priority` | TEXT | High / Medium / Low |
| `due_date` | DATE | When the task is due |
| `status` | TEXT | Completed / Pending |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

Row-Level Security ensures users can only access their own tasks.
