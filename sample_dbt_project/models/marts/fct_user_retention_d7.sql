{{ config(materialized = 'incremental', unique_key = 'user_id') }}

with users as (
    select user_id, register_date, channel, app_version
    from {{ ref('stg_users') }}
    where is_internal = false
),
events_d7 as (
    select user_id, event_date
    from {{ ref('stg_user_events') }}
    where event_date between current_date - interval '14 day' and current_date
)
select
    u.user_id,
    u.register_date,
    u.channel,
    u.app_version,
    case when e.user_id is not null then 1 else 0 end as is_retained_d7
from users u
left join events_d7 e
    on u.user_id = e.user_id
    and e.event_date = u.register_date + interval '7 day'
