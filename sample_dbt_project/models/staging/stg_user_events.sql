with source as (
    select * from {{ source('raw', 'user_events') }}
)
select
    user_id,
    event_date,
    event_name,
    channel,
    app_version
from source
