"""add staff_profiles for operator and admin users

Revision ID: c7d2e9a1f4b3
Revises: b3f1c2d4e5a6
Create Date: 2026-10-01 11:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import models.types

revision: str = 'c7d2e9a1f4b3'
down_revision: Union[str, None] = 'b3f1c2d4e5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('staff_profiles',
    sa.Column('id', models.types.GUID(), nullable=False),
    sa.Column('user_id', models.types.GUID(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('designation', sa.String(length=150), nullable=True),
    sa.Column('unit', sa.String(length=150), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )


def downgrade() -> None:
    op.drop_table('staff_profiles')
