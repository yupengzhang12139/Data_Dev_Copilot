with source as (
    select * from {{ source('raw', 'users') }}
)
select
    user_id,
    register_date,
    channel,
    app_version,
    is_test,
    is_internal
from source
where is_test = false
