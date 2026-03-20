CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_days (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  daily_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS journal_cards (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  sort_order INTEGER NOT NULL,
  fact TEXT NOT NULL DEFAULT '',
  thought TEXT NOT NULL DEFAULT '',
  emotion TEXT NOT NULL DEFAULT '',
  body_sensation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journal_cards_day_fk
    FOREIGN KEY (user_id, date)
    REFERENCES journal_days(user_id, date)
    ON DELETE CASCADE,
  CONSTRAINT journal_cards_sort_order_unique UNIQUE (user_id, date, sort_order)
);

CREATE INDEX IF NOT EXISTS journal_cards_user_date_idx
  ON journal_cards(user_id, date);

CREATE TABLE IF NOT EXISTS weekly_summaries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key DATE NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, week_key)
);

CREATE TABLE IF NOT EXISTS monthly_summaries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month_key)
);

CREATE TABLE IF NOT EXISTS yearly_summaries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_key TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, year_key)
);
