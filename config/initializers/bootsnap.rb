require "bootsnap"

Bootsnap.setup(
  cache_dir: "tmp/cache", # Path to your cache
  ignore_directories: [ "node_modules" ], # Directory names to skip.
  development_mode: false,                # Disable development mode
  load_path_cache: true, # Optimize the LOAD_PATH with a cache
  compile_cache_iseq: true,                 # Compile Ruby code into ISeq cache, breaks coverage reporting.
  compile_cache_yaml: true,                 # Compile YAML into a cache
  compile_cache_json: true,                 # Compile JSON into a cache
  readonly: true # Use the caches but don't update them on miss or stale entries.
)
