"""phase 3: user roles and login tracking, category icon and color, token blocklist

Revision ID: 9a276177eee4
Revises: 85ac05da5624
Create Date: 2026-10-27 18:08:05.390650

The users table already has rows in production, so every new required column
has a server_default: existing users become active, regular users with 0 logins.
No one is made an admin here; that is done with `flask create-admin`.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a276177eee4'
down_revision = '85ac05da5624'
branch_labels = None
depends_on = None


def upgrade():
    # 1. New table: revoked login tokens (logout survives a restart)
    op.create_table('token_blocklist',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('jti', sa.String(length=36), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_token_blocklist')),
    sa.UniqueConstraint('jti', name=op.f('uq_token_blocklist_jti'))
    )
    with op.batch_alter_table('token_blocklist', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_token_blocklist_expires_at'), ['expires_at'], unique=False)

    # 2. Categories: optional icon key and hex colour for the tiles
    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.add_column(sa.Column('icon', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('color', sa.String(length=7), nullable=True))
        batch_op.create_check_constraint(
            op.f('ck_categories_color_length'), "color IS NULL OR length(color) = 7"
        )

    # 3. Users: role, deactivation and login tracking.
    #    server_default fills these in for the users that already exist.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(length=10), server_default='user', nullable=False))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.add_column(sa.Column('last_login_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('login_count', sa.Integer(), server_default='0', nullable=False))
        batch_op.create_check_constraint(
            op.f('ck_users_valid_role'), "role IN ('user', 'admin')"
        )
        batch_op.create_check_constraint(
            op.f('ck_users_login_count_not_negative'), "login_count >= 0"
        )


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_users_login_count_not_negative'), type_='check')
        batch_op.drop_constraint(op.f('ck_users_valid_role'), type_='check')
        batch_op.drop_column('login_count')
        batch_op.drop_column('last_login_at')
        batch_op.drop_column('is_active')
        batch_op.drop_column('role')

    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_categories_color_length'), type_='check')
        batch_op.drop_column('color')
        batch_op.drop_column('icon')

    with op.batch_alter_table('token_blocklist', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_token_blocklist_expires_at'))

    op.drop_table('token_blocklist')
