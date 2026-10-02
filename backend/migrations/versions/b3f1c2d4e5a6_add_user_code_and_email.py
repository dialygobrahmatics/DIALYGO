"""add user_code and email to users

Revision ID: b3f1c2d4e5a6
Revises: 28047b9aab62
Create Date: 2026-10-01 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b3f1c2d4e5a6'
down_revision: Union[str, None] = '28047b9aab62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PREFIX = {"PATIENT": "DUR-PT-{:05d}", "DOCTOR": "DOC-{:04d}"}


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_code', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('email', sa.String(length=255), nullable=True))

    # Backfill existing rows (oldest first) so the column can become NOT NULL.
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, user_type FROM users ORDER BY created_at, id")).fetchall()
    counters: dict[str, int] = {}
    for row in rows:
        counters[row.user_type] = counters.get(row.user_type, 0) + 1
        fmt = PREFIX.get(row.user_type, row.user_type[:3].upper() + "-{:04d}")
        conn.execute(sa.text("UPDATE users SET user_code = :c WHERE id = :i"),
                     {"c": fmt.format(counters[row.user_type]), "i": row.id})

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('user_code', existing_type=sa.String(length=30), nullable=False)
        batch_op.create_index(batch_op.f('ix_users_user_code'), ['user_code'], unique=True)
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))
        batch_op.drop_index(batch_op.f('ix_users_user_code'))
        batch_op.drop_column('email')
        batch_op.drop_column('user_code')
