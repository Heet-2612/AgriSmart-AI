"""remove email verification

Revision ID: 6762e6cf9058
Revises: 0004_add_email_verification
Create Date: 2026-09-14 02:43:11.518384

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_remove_email_verification'
down_revision: Union[str, Sequence[str], None] = '0004_add_email_verification'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop email_verified from users
    op.drop_column('users', 'email_verified')
    
    # Drop email_verification_tokens table
    op.drop_table('email_verification_tokens')


def downgrade() -> None:
    # Recreate email_verification_tokens table
    op.create_table(
        'email_verification_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_verification_tokens_token_hash'), 'email_verification_tokens', ['token_hash'], unique=True)
    
    # Add email_verified back to users
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='true', nullable=False))
