all: tests

tests:
	yarn test
	yarn lint

upload: tests
	yarn publish --non-interactive
