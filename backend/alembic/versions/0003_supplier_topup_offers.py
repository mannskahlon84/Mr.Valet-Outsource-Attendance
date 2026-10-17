"""supplier top-up offers

Revision ID: 0003_supplier_topup_offers
Revises: 0002_login_attempts_indexes
Create Date: 2026-10-17 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_supplier_topup_offers'
down_revision: Union[str, None] = '0002_login_attempts_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('supplier_topup_offers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('supplier_response_id', sa.Integer(), nullable=False),
    sa.Column('extra_quantity', sa.Integer(), nullable=False),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('decision_note', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('decided_at', sa.DateTime(), nullable=True),
    sa.Column('decided_by_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['decided_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['supplier_response_id'], ['supplier_responses.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('supplier_topup_offers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_supplier_topup_offers_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_supplier_topup_offers_supplier_response_id'), ['supplier_response_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('supplier_topup_offers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_supplier_topup_offers_supplier_response_id'))
        batch_op.drop_index(batch_op.f('ix_supplier_topup_offers_id'))

    op.drop_table('supplier_topup_offers')
