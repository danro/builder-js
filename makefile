dev:
	@cd build && node builder.js

test:
	@cd build && node builder.js test

push:
	@cd build && node builder.js push
