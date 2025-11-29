"""Initial schema for BirdSound

Revision ID: 001
Revises:
Create Date: 2025-11-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable PostGIS extension (if available)
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # Create recordings table
    op.create_table(
        'recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('device_id', sa.String(255), nullable=False),
        sa.Column('timestamp_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('altitude_m', sa.Float(), nullable=True),
        sa.Column('duration_sec', sa.Float(), nullable=False),
        sa.Column('sample_rate', sa.Integer(), nullable=False),
        sa.Column('audio_format', sa.String(50), nullable=False),
        sa.Column('audio_storage_path', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('consensus_species', sa.String(255), nullable=True),
        sa.Column('consensus_confidence', sa.Float(), nullable=True),
        sa.Column('consensus_method', sa.String(50), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for recordings
    op.create_index('ix_recordings_device_id', 'recordings', ['device_id'])
    op.create_index('ix_recordings_timestamp_utc', 'recordings', ['timestamp_utc'])
    op.create_index('ix_recordings_location', 'recordings', ['latitude', 'longitude'])
    op.create_index('ix_recordings_device_time', 'recordings', ['device_id', 'timestamp_utc'])

    # Create predictions table
    op.create_table(
        'predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=True),
        sa.Column('species_code', sa.String(50), nullable=True),
        sa.Column('species_scientific', sa.String(255), nullable=True),
        sa.Column('species_common', sa.String(255), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('inference_time_ms', sa.Integer(), nullable=True),
        sa.Column('raw_output', postgresql.JSONB(), nullable=True),
        sa.ForeignKeyConstraint(['recording_id'], ['recordings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for predictions
    op.create_index('ix_predictions_recording_id', 'predictions', ['recording_id'])
    op.create_index('ix_predictions_model_name', 'predictions', ['model_name'])
    op.create_index('ix_predictions_model_species', 'predictions', ['model_name', 'species_common'])
    op.create_index('ix_predictions_confidence', 'predictions', ['confidence'])

    # Create species table
    op.create_table(
        'species',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('species_code', sa.String(50), nullable=False),
        sa.Column('scientific_name', sa.String(255), nullable=False),
        sa.Column('common_name_en', sa.String(255), nullable=False),
        sa.Column('common_name_de', sa.String(255), nullable=True),
        sa.Column('family', sa.String(100), nullable=True),
        sa.Column('order_name', sa.String(100), nullable=True),
        sa.Column('native_to_europe', sa.Boolean(), server_default='false'),
        sa.Column('native_to_germany', sa.Boolean(), server_default='false'),
        sa.Column('birdnet_label', sa.String(255), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('wikipedia_url', sa.Text(), nullable=True),
        sa.Column('xeno_canto_url', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('species_code')
    )

    # Create indexes for species
    op.create_index('ix_species_scientific_name', 'species', ['scientific_name'])
    op.create_index('ix_species_common_name_en', 'species', ['common_name_en'])

    # Create model_performance table
    op.create_table(
        'model_performance',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('total_predictions', sa.Integer(), server_default='0'),
        sa.Column('avg_confidence', sa.Float(), nullable=True),
        sa.Column('avg_inference_time_ms', sa.Float(), nullable=True),
        sa.Column('consensus_agreement_rate', sa.Float(), nullable=True),
        sa.Column('top_species', postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for model_performance
    op.create_index('ix_model_perf_model_date', 'model_performance', ['model_name', 'date'])


def downgrade() -> None:
    op.drop_table('model_performance')
    op.drop_table('species')
    op.drop_table('predictions')
    op.drop_table('recordings')
