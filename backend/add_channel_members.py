from sqlalchemy import text
from app.database import engine  # ✅ Remove the dot

with engine.connect() as conn:
    # Add new columns to channels table
    try:
        conn.execute(text("""
            ALTER TABLE channels 
            ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0
        """))
        print("✅ Added columns to channels table")
    except Exception as e:
        print(f"Note: {e}")
    
    # Update existing channels to have default values
    try:
        conn.execute(text("""
            UPDATE channels 
            SET member_count = 0 
            WHERE member_count IS NULL
        """))
        print("✅ Updated existing channels with default member_count")
    except Exception as e:
        print(f"Note: {e}")
    
    # Create channel_members table
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS channel_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(channel_id, user_id)
            )
        """))
        print("✅ Created channel_members table")
    except Exception as e:
        print(f"Note: {e}")
    
    conn.commit()
    print("✅ Migration complete!")