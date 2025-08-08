copy-template:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Usage: make copy-template <project-name>"; \
		exit 1; \
	fi
	cp -r project-tmp $(filter-out $@,$(MAKECMDGOALS))

%:
	@:

.PHONY: copy-template