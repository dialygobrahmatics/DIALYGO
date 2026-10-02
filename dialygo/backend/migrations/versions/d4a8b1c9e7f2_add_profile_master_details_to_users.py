"""add profile master details and consents to users

Revision ID: d4a8b1c9e7f2
Revises: c7d2e9a1f4b3
Create Date: 2026-10-01 14:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4a8b1c9e7f2'
down_revision: Union[str, None] = 'c7d2e9a1f4b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSENT_COLUMNS = ('consent_data_sharing', 'consent_privacy_notice', 'consent_research')


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('blood_group', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('known_allergies', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('occupation', sa.String(length=150), nullable=True))
        for name in CONSENT_COLUMNS:
            batch_op.add_column(sa.Column(name, sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('consents_updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('consents_updated_at')
        for name in reversed(CONSENT_COLUMNS):
            batch_op.drop_column(name)
        batch_op.drop_column('occupation')
        batch_op.drop_column('known_allergies')
        batch_op.drop_column('emergency_contact')
        batch_op.drop_column('blood_group')
